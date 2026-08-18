#!/usr/bin/env python3
"""
fifa_career_export.py

ONE-STEP FIFA Career Data Pipeline

1. Reads every CSV from a FIFA Live Editor career_data directory.
2. Imports them into a SQLite database.
3. Optionally uses career_schema.json for proper SQLite types/keys.
4. Reads the resulting SQLite database.
5. Builds resolved player/team/league indexes.
6. Resolves the user's current player and club.
7. Generates a JSON export.
8. Generates a frontend-compatible JSON for the React career tracker.

Default output:

    career.sqlite
    career_export.json
    career_frontend.json

The SQLite database contains the COMPLETE raw CSV dataset.

The JSON contains:
    - metadata
    - career identity
    - resolved players
    - resolved teams
    - resolved leagues
    - player -> team relationships
    - team -> league relationships
    - database schemas

The frontend JSON contains:
    - my_player_id, my_player_profile
    - my_squad (teammates with real stats)
    - elite_players_86_plus
    - top_scorers_by_league (real data)
    - seasons (career history from CSVs)

Use --include-raw if you also want every raw SQLite table
embedded inside the JSON.

Usage:

    python3 unified.py \
        --input-dir "./career_data" \
        --output-db "career.sqlite" \
        --output-json "career_export.json"

With schema:

    python3 unified.py \
        --input-dir "./career_data" \
        --output-db "career.sqlite" \
        --output-json "career_export.json" \
        --schema "career_schema.json"

Include the complete raw database inside JSON:

    python3 unified.py \
        --input-dir "./career_data" \
        --output-db "career.sqlite" \
        --output-json "career_export.json" \
        --schema "career_schema.json" \
        --include-raw
"""

import argparse
import csv
import json
import os
import sqlite3
import sys
from pathlib import Path


# ============================================================
# CSV -> SQLITE
# ============================================================

FIELD_TYPE_MAP = {
    "DBOFIELDTYPE_INTEGER": "INTEGER",
    "DBOFIELDTYPE_DATE": "INTEGER",
    "DBOFIELDTYPE_FLOAT": "REAL",
    "DBOFIELDTYPE_STRING": "TEXT",
}

def load_schema(schema_path):
    """
    Load FIFA db_meta.xml schema.
    Converts it into the format the importer expects.
    """

    if not schema_path:
        return {}

    path = Path(schema_path)

    if not path.exists():
        print(
            f"WARNING: schema file not found: {schema_path}"
        )
        return {}

    import xml.etree.ElementTree as ET

    print(f"Loading FIFA schema: {path}")

    tree = ET.parse(path)
    root = tree.getroot()

    schema = {}

    for table in root.findall(".//table"):

        table_name = table.get("name")

        if not table_name:
            continue

        fields = []

        for field in table.findall(".//field"):

            fields.append(
                {
                    "name": field.get("name"),
                    "type": field.get("type"),
                    "key":
                        field.get("key") == "True"
                }
            )

        schema[table_name] = {
            "fields": fields
        }

    print(
        f"Loaded schema for "
        f"{len(schema)} tables"
    )

    return schema

def sqlite_type_for(field_name, table_schema):
    """Determine SQLite type from the FIFA schema."""

    if not table_schema:
        return "TEXT"

    for field in table_schema.get("fields", []):
        if field["name"] == field_name:
            return FIELD_TYPE_MAP.get(
                field.get("type"),
                "TEXT"
            )

    return "TEXT"


def key_fields_for(table_schema):
    """Return fields marked as keys in the schema."""

    if not table_schema:
        return []

    return [
        field["name"]
        for field in table_schema.get("fields", [])
        if field.get("key")
    ]


def quote_ident(name):
    """Safely quote SQLite identifiers."""

    return '"' + name.replace('"', '""') + '"'


def import_csv(csv_path, conn, schema):
    """
    Import one CSV into SQLite.

    Returns:
        row_count
    """

    table_name = csv_path.stem

    with open(
        csv_path,
        "r",
        encoding="utf-8",
        errors="replace",
        newline=""
    ) as f:

        reader = csv.reader(f)

        try:
            header = next(reader)
        except StopIteration:
            print(f"  SKIP {table_name}: empty file")
            return 0

        if not header:
            print(f"  SKIP {table_name}: no header")
            return 0

        table_schema = schema.get(table_name)
        key_fields = key_fields_for(table_schema)

        # ----------------------------------------------------
        # CREATE TABLE
        # ----------------------------------------------------

        columns_sql = []

        for column in header:

            column_type = sqlite_type_for(
                column,
                table_schema
            )

            columns_sql.append(
                f"{quote_ident(column)} {column_type}"
            )

        pk_clause = ""

        if (
            key_fields
            and all(k in header for k in key_fields)
        ):
            pk_columns = ", ".join(
                quote_ident(k)
                for k in key_fields
            )

            pk_clause = (
                f", PRIMARY KEY ({pk_columns})"
            )

        create_sql = (
            f"CREATE TABLE IF NOT EXISTS "
            f"{quote_ident(table_name)} "
            f"({', '.join(columns_sql)}"
            f"{pk_clause})"
        )

        cur = conn.cursor()

        cur.execute(
            f"DROP TABLE IF EXISTS "
            f"{quote_ident(table_name)}"
        )

        cur.execute(create_sql)

        # ----------------------------------------------------
        # INSERT
        # ----------------------------------------------------

        placeholders = ", ".join(
            "?" for _ in header
        )

        insert_sql = (
            f"INSERT OR IGNORE INTO "
            f"{quote_ident(table_name)} "
            f"({', '.join(quote_ident(c) for c in header)}) "
            f"VALUES ({placeholders})"
        )

        batch = []
        row_count = 0
        skipped_rows = 0

        BATCH_SIZE = 5000

        for row in reader:

            if len(row) != len(header):
                skipped_rows += 1
                continue

            # Empty CSV values become SQL NULL.
            row = [
                None if value == "" else value
                for value in row
            ]

            batch.append(row)
            row_count += 1

            if len(batch) >= BATCH_SIZE:

                cur.executemany(
                    insert_sql,
                    batch
                )

                batch = []

        if batch:
            cur.executemany(
                insert_sql,
                batch
            )

        conn.commit()

        message = (
            f"  {table_name}: "
            f"{row_count:,} rows"
        )

        if skipped_rows:
            message += (
                f" "
                f"({skipped_rows:,} malformed rows skipped)"
            )

        print(message)

        return row_count


def import_all_csvs(
    input_dir,
    conn,
    schema
):
    """Import every CSV into SQLite."""

    csv_files = sorted(
        input_dir.glob("*.csv")
    )

    if not csv_files:
        raise RuntimeError(
            f"No CSV files found in {input_dir}"
        )

    print()
    print("=" * 60)
    print("CSV -> SQLITE")
    print("=" * 60)

    print(
        f"Found {len(csv_files)} CSV files"
    )

    total_rows = 0
    tables_imported = 0

    for index, csv_path in enumerate(
        csv_files,
        1
    ):

        print(
            f"[{index}/{len(csv_files)}] "
            f"{csv_path.name}"
        )

        try:

            rows = import_csv(
                csv_path,
                conn,
                schema
            )

            total_rows += rows
            tables_imported += 1

        except Exception as exc:

            print(
                f"  ERROR: {csv_path.name}: "
                f"{exc}"
            )

    return (
        len(csv_files),
        tables_imported,
        total_rows
    )


# ============================================================
# SQLITE HELPERS
# ============================================================

def rows_as_dicts(cursor):

    columns = [
        description[0]
        for description in cursor.description
    ]

    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]


def get_tables(conn):

    cur = conn.cursor()

    cur.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    """)

    return [
        row[0]
        for row in cur.fetchall()
    ]


def table_exists(conn, table):

    cur = conn.cursor()

    cur.execute("""
        SELECT 1
        FROM sqlite_master
        WHERE type = 'table'
        AND name = ?
    """, (table,))

    return cur.fetchone() is not None


def get_table_schema(conn, table_name):

    cur = conn.cursor()

    cur.execute(
        f'PRAGMA table_info("{table_name}")'
    )

    return [
        {
            "cid": row[0],
            "name": row[1],
            "type": row[2],
            "notnull": bool(row[3]),
            "default": row[4],
            "primary_key": bool(row[5]),
        }
        for row in cur.fetchall()
    ]


# ============================================================
# RESOLVED PLAYER INDEX
# ============================================================

def resolve_players(conn):

    if not table_exists(
        conn,
        "players"
    ):
        return []

    required = [
        "playernames"
    ]

    if not all(
        table_exists(conn, table)
        for table in required
    ):
        print(
            "WARNING: playernames table missing. "
            "Returning raw players."
        )

        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM players"
        )

        return rows_as_dicts(cur)

    cur = conn.cursor()

    cur.execute("""
        SELECT
            p.*,

            fn.name AS resolved_firstname,
            ln.name AS resolved_lastname,
            cn.name AS resolved_commonname

        FROM players p

        LEFT JOIN playernames fn
            ON fn.nameid = p.firstnameid

        LEFT JOIN playernames ln
            ON ln.nameid = p.lastnameid

        LEFT JOIN playernames cn
            ON cn.nameid = p.commonnameid
    """)

    return rows_as_dicts(cur)


# ============================================================
# TEAM INDEX
# ============================================================

def resolve_teams(conn):

    if not table_exists(
        conn,
        "teams"
    ):
        return []

    cur = conn.cursor()

    cur.execute(
        "SELECT * FROM teams"
    )

    return rows_as_dicts(cur)


# ============================================================
# LEAGUE INDEX
# ============================================================

def resolve_leagues(conn):

    if not table_exists(
        conn,
        "leagues"
    ):
        return []

    cur = conn.cursor()

    cur.execute(
        "SELECT * FROM leagues"
    )

    return rows_as_dicts(cur)


# ============================================================
# PLAYER -> TEAM
# ============================================================

def resolve_player_team_links(conn):

    required = [
        "teamplayerlinks",
        "players",
        "teams",
    ]

    if not all(
        table_exists(conn, table)
        for table in required
    ):
        return []

    cur = conn.cursor()

    cur.execute("""
        SELECT
            tpl.*,

            p.playerid,

            fn.name AS firstname,
            ln.name AS lastname,
            cn.name AS commonname,

            t.teamname

        FROM teamplayerlinks tpl

        LEFT JOIN players p
            ON p.playerid = tpl.playerid

        LEFT JOIN playernames fn
            ON fn.nameid = p.firstnameid

        LEFT JOIN playernames ln
            ON ln.nameid = p.lastnameid

        LEFT JOIN playernames cn
            ON cn.nameid = p.commonnameid

        LEFT JOIN teams t
            ON t.teamid = tpl.teamid
    """)

    return rows_as_dicts(cur)


# ============================================================
# TEAM -> LEAGUE
# ============================================================

def resolve_league_team_links(conn):

    required = [
        "leagueteamlinks",
        "teams",
        "leagues",
    ]

    if not all(
        table_exists(conn, table)
        for table in required
    ):
        return []

    cur = conn.cursor()

    # Some FIFA databases use slightly different
    # league-name columns. Start with the known schema.
    cur.execute("""
        SELECT
            ltl.*,

            t.teamname,

            l.leaguename

        FROM leagueteamlinks ltl

        LEFT JOIN teams t
            ON t.teamid = ltl.teamid

        LEFT JOIN leagues l
            ON l.leagueid = ltl.leagueid
    """)

    return rows_as_dicts(cur)


# ============================================================
# USER CAREER
# ============================================================

def resolve_my_career(conn):

    result = {
        "career_user": None,
        "clubteamid": None,
        "club": None,
        "playerid": None,
        "player_profile": None,
    }

    # --------------------------------------------------------
    # CAREER USER
    # --------------------------------------------------------

    if table_exists(
        conn,
        "career_users"
    ):

        cur = conn.cursor()

        cur.execute("""
            SELECT *
            FROM career_users
            LIMIT 1
        """)

        rows = rows_as_dicts(cur)

        if rows:

            user = rows[0]

            result["career_user"] = user

            team_id = user.get(
                "clubteamid"
            )

            result["clubteamid"] = team_id

            # Resolve current club
            if (
                team_id is not None
                and table_exists(
                    conn,
                    "teams"
                )
            ):

                cur.execute("""
                    SELECT *
                    FROM teams
                    WHERE teamid = ?
                    LIMIT 1
                """, (team_id,))

                team_rows = rows_as_dicts(cur)

                if team_rows:

                    team = team_rows[0]

                    result["club"] = {
                        "teamid": team.get(
                            "teamid"
                        ),
                        "teamname": team.get(
                            "teamname"
                        ),
                        "full_record": team
                    }

    # --------------------------------------------------------
    # BE A PRO PLAYER
    # --------------------------------------------------------

    if table_exists(
        conn,
        "career_playasplayer"
    ):

        cur = conn.cursor()

        cur.execute("""
            SELECT *
            FROM career_playasplayer
        """)

        rows = rows_as_dicts(cur)

        if rows:

            player_id = rows[0].get(
                "playerid"
            )

            result["playerid"] = player_id

            if (
                player_id is not None
                and table_exists(
                    conn,
                    "players"
                )
            ):

                cur.execute("""
                    SELECT
                        p.*,

                        fn.name AS firstname,
                        ln.name AS lastname,
                        cn.name AS commonname

                    FROM players p

                    LEFT JOIN playernames fn
                        ON fn.nameid = p.firstnameid

                    LEFT JOIN playernames ln
                        ON ln.nameid = p.lastnameid

                    LEFT JOIN playernames cn
                        ON cn.nameid = p.commonnameid

                    WHERE p.playerid = ?

                    LIMIT 1
                """, (player_id,))

                profile = rows_as_dicts(cur)

                if profile:
                    result["player_profile"] = profile[0]

    # --------------------------------------------------------
    # LOAN STATUS
    # --------------------------------------------------------

    if (
        result.get("playerid") is not None
        and table_exists(conn, "playerloans")
    ):
        cur = conn.cursor()
        cur.execute("""
            SELECT *
            FROM playerloans
            WHERE playerid = ?
            LIMIT 1
        """, (str(result["playerid"]),))
        loan_rows = rows_as_dicts(cur)
        if loan_rows:
            loan = loan_rows[0]
            parent_club_id = loan.get("teamidloanedfrom")
            # Resolve parent club name
            parent_club_name = None
            if parent_club_id and table_exists(conn, "teams"):
                cur.execute("""
                    SELECT teamname FROM teams WHERE teamid = ? LIMIT 1
                """, (parent_club_id,))
                parent_rows = rows_as_dicts(cur)
                if parent_rows:
                    parent_club_name = parent_rows[0].get("teamname")
            result["loan"] = {
                "isOnLoan": True,
                "parentClubId": parent_club_id,
                "parentClubName": parent_club_name or f"Team {parent_club_id}",
                "loanEndDate": loan.get("loandateend"),
                "isLoanToBuy": loan.get("isloantobuy") == "1",
            }
        else:
            result["loan"] = {"isOnLoan": False}
    else:
        result["loan"] = {"isOnLoan": False}

    return result


# ============================================================
# RAW DATABASE EXPORT
# ============================================================

def dump_all_tables(conn):

    raw_database = {}

    tables = get_tables(conn)

    for index, table in enumerate(
        tables,
        1
    ):

        print(
            f"  [{index}/{len(tables)}] "
            f"{table}"
        )

        cur = conn.cursor()

        cur.execute(
            f'SELECT * FROM "{table}"'
        )

        raw_database[table] = rows_as_dicts(
            cur
        )

    return raw_database


# ============================================================
# JSON GENERATION
# ============================================================

def generate_json(
    conn,
    output_path,
    include_raw=False
):

    print()
    print("=" * 60)
    print("BUILDING JSON EXPORT")
    print("=" * 60)

    tables = get_tables(conn)

    print(
        f"SQLite contains {len(tables)} tables"
    )

    print("\nResolving players...")

    players = resolve_players(conn)

    print(
        f"  Players: {len(players):,}"
    )

    print("\nResolving teams...")

    teams = resolve_teams(conn)

    print(
        f"  Teams: {len(teams):,}"
    )

    print("\nResolving leagues...")

    leagues = resolve_leagues(conn)

    print(
        f"  Leagues: {len(leagues):,}"
    )

    print(
        "\nResolving player/team relationships..."
    )

    player_team_links = (
        resolve_player_team_links(conn)
    )

    print(
        f"  Links: "
        f"{len(player_team_links):,}"
    )

    print(
        "\nResolving team/league relationships..."
    )

    league_team_links = (
        resolve_league_team_links(conn)
    )

    print(
        f"  Links: "
        f"{len(league_team_links):,}"
    )

    print(
        "\nResolving career identity..."
    )

    career = resolve_my_career(conn)

    print(
        f"  Player ID: "
        f"{career.get('playerid')}"
    )

    print(
        f"  Club ID: "
        f"{career.get('clubteamid')}"
    )

    club = career.get("club")

    if club:
        print(
            f"  Club: "
            f"{club.get('teamname')}"
        )

    # --------------------------------------------------------
    # SCHEMAS
    # --------------------------------------------------------

    print(
        "\nCollecting table schemas..."
    )

    schemas = {}

    for table in tables:

        schemas[table] = get_table_schema(
            conn,
            table
        )

    # --------------------------------------------------------
    # FINAL OBJECT
    # --------------------------------------------------------

    output = {

        "metadata": {
            "source_database":
                str(output_path.with_suffix(".sqlite")),

            "table_count":
                len(tables),

            "tables":
                tables,

            "description":
                "FIFA career data export. "
                "SQLite contains the complete raw "
                "database. JSON contains resolved "
                "indexes and career identity."
        },

        "career": career,

        "indexes": {

            "players":
                players,

            "teams":
                teams,

            "leagues":
                leagues,

            "player_team_links":
                player_team_links,

            "league_team_links":
                league_team_links,
        },

        "schemas":
            schemas,
    }

    # --------------------------------------------------------
    # OPTIONAL RAW TABLES
    # --------------------------------------------------------

    if include_raw:

        print(
            "\nEmbedding complete raw tables "
            "into JSON..."
        )

        output["tables"] = dump_all_tables(
            conn
        )

    # --------------------------------------------------------
    # WRITE
    # --------------------------------------------------------

    print(
        f"\nWriting JSON to {output_path}..."
    )

    with open(
        output_path,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            output,
            f,
            ensure_ascii=False,
            indent=2,
            default=str
        )

    size_mb = (
        output_path.stat().st_size
        / (1024 * 1024)
    )

    print()
    print("=" * 60)
    print("JSON EXPORT COMPLETE")
    print("=" * 60)

    print(
        f"Players:      {len(players):,}"
    )

    print(
        f"Teams:        {len(teams):,}"
    )

    print(
        f"Leagues:      {len(leagues):,}"
    )

    print(
        f"Player links: "
        f"{len(player_team_links):,}"
    )

    print(
        f"JSON size:    "
        f"{size_mb:.2f} MB"
    )

    if include_raw:
        print(
            "\nNOTE: Raw tables were embedded."
        )
    else:
        print(
            "\nRaw tables remain in SQLite."
        )


# ============================================================
# FRONTEND JSON GENERATION
# ============================================================

POSITION_MAP = {
    0: 'GK', 2: 'RWB', 3: 'RB', 4: 'CB', 5: 'CB', 6: 'CB',
    7: 'LB', 8: 'LWB', 10: 'CDM', 11: 'RM', 12: 'CM', 13: 'CM',
    14: 'CM', 15: 'CAM', 16: 'LM', 17: 'LW', 18: 'CAM', 19: 'ST',
    20: 'ST', 21: 'ST', 22: 'CF', 23: 'RW', 24: 'ST', 25: 'ST',
    26: 'LW', 27: 'CF', 28: 'CF', 29: 'RW', 30: 'LW'
}

TOP_5_LEAGUE_IDS = {
    '13': 'Premier League', '53': 'La Liga', '19': 'Bundesliga',
    '31': 'Serie A', '16': 'Ligue 1'
}


def safe_int(val, default=0):
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


def resolve_name_from_row(row):
    """Get best name from a dict that may have various name fields."""
    cn = (row.get('commonname') or row.get('resolved_commonname') or '').strip()
    if cn:
        return cn
    fn = (row.get('firstname') or row.get('resolved_firstname') or '').strip()
    ln = (row.get('lastname') or row.get('resolved_lastname') or '').strip()
    if fn and ln:
        return f"{fn} {ln}"
    if ln:
        return ln
    return f"Player #{row.get('playerid', '?')}"


def generate_frontend_json(conn, output_path, input_dir=None):
    """
    Generate a frontend-compatible JSON from the SQLite database.
    This is the format the React data adapter expects.
    """

    print()
    print("=" * 60)
    print("BUILDING FRONTEND JSON")
    print("=" * 60)

    # --- User career identity ---
    career = resolve_my_career(conn)
    player_id = career.get('playerid')
    club_id = career.get('clubteamid')
    profile = career.get('player_profile') or {}
    club = career.get('club') or {}

    print(f"  Player ID: {player_id}")
    print(f"  Club: {club.get('teamname', 'Unknown')}")

    # --- All players (resolved names) ---
    players_list = resolve_players(conn)
    players_by_id = {p['playerid']: p for p in players_list}

    # --- Player team links ---
    ptl = resolve_player_team_links(conn)

    # --- League team links ---
    ltl = resolve_league_team_links(conn)
    team_league_map = {}
    for link in ltl:
        team_league_map[link['teamid']] = link.get('leagueid', 0)

    # --- Build my_player_profile ---
    # Try to load player_name.json (written by Lua export via GetPlayerName API)
    # This fills in names when the players table doesn't have this player
    lua_name_data = None
    lua_name_path = os.path.join(input_dir or '.', 'player_name.json')
    if os.path.exists(lua_name_path):
        try:
            with open(lua_name_path, 'r', encoding='utf-8') as f:
                lua_name_data = json.load(f)
            print(f"  Loaded player_name.json: {lua_name_data.get('fullname', 'unknown')}")
        except Exception:
            pass

    # Use Lua-provided names as fallback when DB names are empty
    fn_from_db = (profile.get('firstname') or '').strip()
    ln_from_db = (profile.get('lastname') or '').strip()
    cn_from_db = (profile.get('commonname') or '').strip()
    if not fn_from_db and not ln_from_db and not cn_from_db and lua_name_data:
        fn_from_db = lua_name_data.get('firstname', '')
        ln_from_db = lua_name_data.get('lastname', '')
        cn_from_db = lua_name_data.get('commonname', '')
        print(f"  Name from Lua API: {fn_from_db} {ln_from_db}")

    nat_id = safe_int(profile.get('nationality'))
    my_profile = {
        'playerid': str(player_id or ''),
        'firstname': fn_from_db,
        'lastname': ln_from_db,
        'commonname': cn_from_db,
        'overallrating': str(profile.get('overallrating', 65)),
        'potential': str(profile.get('potential', 81)),
        'height': str(profile.get('height', 181)),
        'weight': str(profile.get('weight', 75)),
        'preferredfoot': str(profile.get('preferredfoot', 1)),
        'birthdate': str(profile.get('birthdate', 155198)),
        'preferredposition1': str(profile.get('preferredposition1', 23)),
        'nationality': str(nat_id),
        'finishing': str(profile.get('finishing', 40)),
        'shotpower': str(profile.get('shotpower', 50)),
        'longshots': str(profile.get('longshots', 40)),
        'volleys': str(profile.get('volleys', 30)),
        'penalties': str(profile.get('penalties', 35)),
        'vision': str(profile.get('vision', 45)),
        'crossing': str(profile.get('crossing', 40)),
        'shortpassing': str(profile.get('shortpassing', 50)),
        'longpassing': str(profile.get('longpassing', 40)),
        'curve': str(profile.get('curve', 35)),
        'agility': str(profile.get('agility', 50)),
        'balance': str(profile.get('balance', 45)),
        'reactions': str(profile.get('reactions', 55)),
        'ballcontrol': str(profile.get('ballcontrol', 55)),
        'dribbling': str(profile.get('dribbling', 50)),
        'composure': str(profile.get('composure', 55)),
        'interceptions': str(profile.get('interceptions', 50)),
        'headingaccuracy': str(profile.get('headingaccuracy', 45)),
        'defensiveawareness': str(profile.get('defensiveawareness', 50)),
        'standingtackle': str(profile.get('standingtackle', 55)),
        'slidingtackle': str(profile.get('slidingtackle', 50)),
        'stamina': str(profile.get('stamina', 60)),
        'strength': str(profile.get('strength', 60)),
        'jumping': str(profile.get('jumping', 55)),
        'aggression': str(profile.get('aggression', 55)),
        'acceleration': str(profile.get('acceleration', 50)),
        'sprintspeed': str(profile.get('sprintspeed', 50)),
    }

    # --- Squad teammates ---
    my_team_id = safe_int(club_id)
    squad_links = [l for l in ptl if safe_int(l.get('teamid')) == my_team_id]

    my_squad = []
    for link in squad_links:
        pid = link.get('playerid')
        full = players_by_id.get(pid, {})
        pos_code = safe_int(link.get('position', full.get('preferredposition1', 0)))
        is_user = str(pid) == str(player_id)

        # For user player, try to get totals from career_playasplayerhistory
        user_goals = 0
        user_assists = 0
        user_apps = 0
        if is_user and table_exists(conn, 'career_playasplayerhistory'):
            cur = conn.cursor()
            cur.execute("SELECT * FROM career_playasplayerhistory")
            for h in rows_as_dicts(cur):
                user_goals += safe_int(h.get('goals'))
                user_assists += safe_int(h.get('assists'))
                user_apps += safe_int(h.get('appearances'))

        my_squad.append({
            'squad_position': POSITION_MAP.get(pos_code, 'CM'),
            'jerseynumber': str(link.get('jerseynumber', 0)),
            'form': str(link.get('form', 3)),
            'leaguegoals': str(user_goals if is_user else safe_int(link.get('leaguegoals'))),
            'leagueappearances': str(user_apps if is_user else safe_int(link.get('leagueappearances'))),
            'playerid': str(pid),
            'firstname': full.get('firstname') or full.get('resolved_firstname'),
            'lastname': full.get('lastname') or full.get('resolved_lastname'),
            'commonname': full.get('commonname') or full.get('resolved_commonname'),
            'overallrating': str(full.get('overallrating', 70)),
            'potential': str(full.get('potential', 75)),
            'height': str(full.get('height', 180)),
            'weight': str(full.get('weight', 75)),
            'preferredfoot': str(full.get('preferredfoot', 1)),
            'birthdate': str(full.get('birthdate', 150000)),
            'preferredposition1': str(full.get('preferredposition1', 14)),
            'nationality': str(full.get('nationality', '')),
            'isUserPlayer': is_user,
        })

    my_squad.sort(key=lambda x: safe_int(x['overallrating']), reverse=True)

    # --- Elite players (86+) ---
    elite = []
    for p in players_list:
        ovr = safe_int(p.get('overallrating'))
        if ovr >= 86:
            team_link = next((l for l in ptl if l.get('playerid') == p.get('playerid')), None)
            pos_code = safe_int(p.get('preferredposition1', 0))
            elite.append({
                'playerid': str(p.get('playerid')),
                'firstname': p.get('firstname') or p.get('resolved_firstname'),
                'lastname': p.get('lastname') or p.get('resolved_lastname'),
                'commonname': p.get('commonname') or p.get('resolved_commonname'),
                'overallrating': str(ovr),
                'potential': str(p.get('potential', ovr)),
                'height': str(p.get('height', 180)),
                'weight': str(p.get('weight', 75)),
                'preferredfoot': str(p.get('preferredfoot', 1)),
                'birthdate': str(p.get('birthdate', 150000)),
                'preferredposition1': str(pos_code),
                'teamname': (team_link or {}).get('teamname', 'Unknown'),
            })
    elite.sort(key=lambda x: safe_int(x['overallrating']), reverse=True)

    # --- Top scorers by league ---
    league_scorers = {}
    for link in ptl:
        lid = team_league_map.get(link.get('teamid'), 0)
        if lid not in TOP_5_LEAGUE_IDS:
            continue
        goals = safe_int(link.get('leaguegoals'))
        if goals <= 0:
            continue
        pid = link.get('playerid')
        full = players_by_id.get(pid, {})
        league_name = TOP_5_LEAGUE_IDS[lid]
        if league_name not in league_scorers:
            league_scorers[league_name] = []
        pos_code = safe_int(link.get('position', full.get('preferredposition1', 0)))
        league_scorers[league_name].append({
            'playerid': str(pid),
            'firstname': full.get('firstname') or full.get('resolved_firstname'),
            'lastname': full.get('lastname') or full.get('resolved_lastname'),
            'commonname': full.get('commonname') or full.get('resolved_commonname'),
            'overallrating': str(full.get('overallrating', 70)),
            'potential': str(full.get('potential', 75)),
            'height': str(full.get('height', 180)),
            'weight': str(full.get('weight', 75)),
            'preferredfoot': str(full.get('preferredfoot', 1)),
            'birthdate': str(full.get('birthdate', 150000)),
            'preferredposition1': str(pos_code),
            'teamname': link.get('teamname', 'Unknown'),
            'leaguegoals': str(goals),
            'leagueappearances': str(safe_int(link.get('leagueappearances'))),
        })

    top_scorers = {}
    for league, players in league_scorers.items():
        players.sort(key=lambda x: safe_int(x['leaguegoals']), reverse=True)
        top_scorers[league] = players[:20]

    # --- Resolve all team names (needed for club history) ---
    team_names = {}
    league_names = {}
    if table_exists(conn, 'teams'):
        cur = conn.cursor()
        cur.execute("SELECT teamid, teamname FROM teams")
        team_names = {str(r[0]): r[1] for r in cur.fetchall()}
    if table_exists(conn, 'leagues'):
        cur = conn.cursor()
        cur.execute("SELECT leagueid, leaguename FROM leagues")
        league_names = {str(r[0]): r[1] for r in cur.fetchall()}
    else:
        league_names = {}

    # --- League teams (dynamic based on user's league) ---
    league_teams = {}
    if table_exists(conn, 'leagueteamlinks') and table_exists(conn, 'teams'):
        cur = conn.cursor()
        # Get all teams per league
        cur.execute("SELECT leagueid, teamid FROM leagueteamlinks")
        league_team_map = {}
        for row in cur.fetchall():
            lid = str(row[0])
            tid = str(row[1])
            if lid not in league_team_map:
                league_team_map[lid] = []
            league_team_map[lid].append(tid)
        
        # Build league teams dict — use resolved league names as keys
        for lid, tids in league_team_map.items():
            league_name = league_names.get(lid, f'League {lid}')
            league_teams[league_name] = [
                {'teamid': tid, 'teamname': team_names.get(tid, f'Team {tid}')}
                for tid in tids
            ]

    # --- Seasons from career_playasplayerhistory ---
    seasons = []
    total_goals = 0
    total_assists = 0
    total_apps = 0
    if table_exists(conn, 'career_playasplayerhistory'):
        cur = conn.cursor()
        cur.execute("SELECT * FROM career_playasplayerhistory ORDER BY season")
        for row in rows_as_dicts(cur):
            season_num = safe_int(row.get('season'))
            goals = safe_int(row.get('goals'))
            assists = safe_int(row.get('assists'))
            apps = safe_int(row.get('appearances'))
            total_goals += goals
            total_assists += assists
            total_apps += apps

            # Calculate age from birthdate (FIFA epoch: Jan 1, 1583)
            # season_num: 1 = 2022/23, 2 = 2023/24, etc.
            season_year = 2021 + season_num
            birthdate_str = str(profile.get('birthdate', '0'))
            birthdate_days = safe_int(birthdate_str)
            if birthdate_days > 0:
                from datetime import datetime, timedelta
                epoch = datetime(1583, 1, 1)
                birth = epoch + timedelta(days=birthdate_days)
                season_date = datetime(season_year, 8, 1)
                age = season_date.year - birth.year - ((season_date.month, season_date.day) < (birth.month, birth.day))
            else:
                age = 14 + season_num
            
            # Calculate avg rating from match rating history (more accurate)
            avg_rating = 0
            if table_exists(conn, 'career_playermatchratinghistory'):
                cur2 = conn.cursor()
                # Get ratings for this player in this season's date range
                season_start = f'{2022 + season_num}0101'
                season_end = f'{2023 + season_num}1231'
                cur2.execute("""
                    SELECT AVG(rating) FROM career_playermatchratinghistory 
                    WHERE playerid = ? AND date >= ? AND date <= ?
                """, (str(player_id), season_start, season_end))
                row2 = cur2.fetchone()
                if row2 and row2[0]:
                    avg_rating = round(float(row2[0]), 2)

            # Resolve team and league from this season's data
            season_teamid = str(row.get('teamid', ''))
            season_leagueid = str(row.get('leagueid', ''))
            season_club = team_names.get(season_teamid, club.get('teamname', 'Unknown'))
            season_league = league_names.get(season_leagueid, TOP_5_LEAGUE_IDS.get(season_leagueid, 'Unknown'))

            # Build trophies list from career_playasplayerhistory aggregate fields
            season_trophies = []
            league_trophies = safe_int(row.get('leaguetrophies', 0))
            domestic_cup_trophies = safe_int(row.get('domesticcuptrophies', 0))
            continental_cup_trophies = safe_int(row.get('continentalcuptrophies', 0))
            if league_trophies > 0:
                # Map league IDs to trophy names
                league_trophy_names = {
                    '13': 'Premier League', '53': 'La Liga', '19': 'Bundesliga',
                    '31': 'Serie A', '16': 'Ligue 1', '819': 'Premier League'
                }
                trophy_name = league_trophy_names.get(season_leagueid, 'League')
                for _ in range(league_trophies):
                    season_trophies.append(trophy_name)
            if domestic_cup_trophies > 0:
                for _ in range(domestic_cup_trophies):
                    season_trophies.append('Domestic Cup')
            if continental_cup_trophies > 0:
                for _ in range(continental_cup_trophies):
                    season_trophies.append('Champions League')

            seasons.append({
                'id': f'season_{season_num}',
                'season': f'{2022 + season_num}/{2023 + season_num}',
                'age': age,
                'club': season_club,
                'clubId': season_teamid,
                'league': season_league,
                'leagueId': season_leagueid,
                'clubBadgeColor': 'bg-zinc-800',
                'apps': apps,
                'goals': goals,
                'assists': assists,
                'avgRating': avg_rating,
                'overall': safe_int(row.get('overall')),
                'yellowCards': safe_int(row.get('totalyellows')),
                'redCards': safe_int(row.get('totalreds')),
                'trophies': season_trophies,
                'individualAwards': [],
                'highlights': f'{goals} goals, {assists} assists in {apps} appearances',
                'xG': 0,
                'xA': 0,
                'keyPassesPerGame': 0,
                'dribblesPerGame': 0,
                'competitionStats': [],  # Will be populated below
            })

    # --- Load Competition Stats from Lua export ---
    # Derive input_dir from output_path if not provided
    if input_dir is None:
        # output_path is like .../script/career_export.json, input is .../career_data
        input_dir = output_path.parent.parent / 'career_data'
    
    total_motm = 0  # Initialize before try block
    
    competition_stats_path = input_dir / 'competition_stats.json'
    if competition_stats_path.exists():
        try:
            with open(competition_stats_path, 'r', encoding='utf-8') as f:
                comp_stats = json.load(f)
            
            if comp_stats and seasons:
                # Add competition stats to the latest season
                latest_season = seasons[-1]
                latest_season['competitionStats'] = comp_stats
                
                # Also compute totals from competition stats for backward compatibility
                total_apps = sum(c.get('apps', 0) for c in comp_stats)
                total_goals_comp = sum(c.get('goals', 0) for c in comp_stats)
                total_assists_comp = sum(c.get('assists', 0) for c in comp_stats)
                total_yellow = sum(c.get('yellow', 0) for c in comp_stats)
                total_red = sum(c.get('red', 0) for c in comp_stats)
                total_motm = sum(c.get('motm', 0) for c in comp_stats)
                
                # Update season totals if competition stats have data
                if total_apps > 0:
                    latest_season['apps'] = total_apps
                    latest_season['goals'] = total_goals_comp
                    latest_season['assists'] = total_assists_comp
                    latest_season['yellowCards'] = total_yellow
                    latest_season['redCards'] = total_red
                    latest_season['motm'] = total_motm
                    
                    # Recalculate avg rating from competition stats
                    total_avg = sum(c.get('avgRating', 0) * c.get('apps', 0) for c in comp_stats)
                    if total_apps > 0:
                        latest_season['avgRating'] = round(total_avg / total_apps, 2)
                
                print(f"  Competition stats: {len(comp_stats)} competitions loaded")
                for c in comp_stats:
                    print(f"    - {c.get('competition', 'Unknown')}: {c.get('apps', 0)} apps, {c.get('goals', 0)}G {c.get('assists', 0)}A")
        except Exception as e:
            print(f"  Warning: Could not load competition_stats.json: {e}")

    # --- Club History (group seasons by club) ---
    club_history = []
    club_seasons_map = {}
    for s in seasons:
        cid = s.get('clubId', '')
        if cid not in club_seasons_map:
            # Read historical trophy data from teams.csv
            team_record = {}
            if table_exists(conn, 'teams'):
                cur = conn.cursor()
                cur.execute("SELECT leaguetitles, domesticcups, uefa_cl_wins, uefa_el_wins, uefa_uecl_wins FROM teams WHERE teamid = ?", (cid,))
                row = cur.fetchone()
                if row:
                    team_record = {
                        'leagueTitles': safe_int(row[0]),
                        'domesticCups': safe_int(row[1]),
                        'uclWins': safe_int(row[2]),
                        'uelWins': safe_int(row[3]),
                        'ueclWins': safe_int(row[4]),
                    }
            
            club_seasons_map[cid] = {
                'teamid': cid,
                'teamname': s['club'],
                'league': s['league'],
                'leagueId': s.get('leagueId', ''),
                'seasons': [],
                'totalGoals': 0,
                'totalAssists': 0,
                'totalApps': 0,
                'historicalTrophies': team_record,
                'trophiesWithPlayer': {'league': 0, 'domesticCup': 0, 'ucl': 0, 'uel': 0},
                'isCurrentClub': cid == str(club.get('teamid', '')),
            }
        entry = club_seasons_map[cid]
        entry['seasons'].append(s)
        entry['totalGoals'] += s['goals']
        entry['totalAssists'] += s['assists']
        entry['totalApps'] += s['apps']
        
        # Count trophies won with player from career_playasplayerhistory
        entry['trophiesWithPlayer']['league'] += safe_int(s.get('leaguetrophies', 0))
        entry['trophiesWithPlayer']['domesticCup'] += safe_int(s.get('domesticcuptrophies', 0))
        entry['trophiesWithPlayer']['ucl'] += safe_int(s.get('continentalcuptrophies', 0))

    # Sort clubs by first season played
    for cid, entry in club_seasons_map.items():
        club_history.append(entry)
    club_history.sort(key=lambda c: int(c['seasons'][0].get('id', 'season_0').split('_')[1]) if c['seasons'] else 0)

    # --- Contract data (wage) ---
    wage = 0
    if table_exists(conn, 'career_playercontract'):
        cur = conn.cursor()
        cur.execute("SELECT wage FROM career_playercontract WHERE playerid = ? LIMIT 1", (str(player_id),))
        row = cur.fetchone()
        if row:
            wage = safe_int(row[0])

    # --- Market value (from career_playasplayerhistory) ---
    market_value = 0
    if table_exists(conn, 'career_playasplayerhistory'):
        cur = conn.cursor()
        cur.execute("SELECT value FROM career_playasplayerhistory ORDER BY season DESC LIMIT 1")
        row = cur.fetchone()
        if row:
            market_value = safe_int(row[0])

    # --- Latest match rating ---
    latest_match_rating = 0
    if table_exists(conn, 'career_playermatchratinghistory'):
        cur = conn.cursor()
        cur.execute("SELECT rating FROM career_playermatchratinghistory WHERE playerid = ? ORDER BY date DESC LIMIT 1", (str(player_id),))
        row = cur.fetchone()
        if row:
            latest_match_rating = safe_int(row[0])

    # --- Season tracking (from actual data, not assumptions) ---
    matches_played = 0
    latest_match_date = ''
    season_start_date = ''
    season_end_date = ''
    current_game_date = ''
    
    # Count actual appearances from squad entry (most accurate source)
    # The match rating history may be incomplete if not all matches have ratings logged
    user_squad_apps = 0
    user_squad_entry = None
    if my_squad:
        for link in my_squad:
            if str(link.get('playerid')) == str(player_id):
                user_squad_entry = link
                user_squad_apps = safe_int(link.get('leagueappearances'))
                break
    
    # Use squad appearances as primary; fall back to match rating history
    matches_played = user_squad_apps if user_squad_apps > 0 else 0
    latest_match_date = ''
    if table_exists(conn, 'career_playermatchratinghistory'):
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*), MAX(date) FROM career_playermatchratinghistory WHERE playerid = ?", (str(player_id),))
        row = cur.fetchone()
        if row:
            history_count = row[0] or 0
            latest_match_date = str(row[1] or '')
            # If history has more entries than squad (shouldn't happen but safety), use it
            if history_count > matches_played:
                matches_played = history_count
    
    # Get season dates from calendar
    if table_exists(conn, 'career_calendar'):
        cur = conn.cursor()
        cur.execute("SELECT startdate, enddate, currdate FROM career_calendar LIMIT 1")
        row = cur.fetchone()
        if row:
            season_start_date = str(row[0] or '')
            season_end_date = str(row[1] or '')
            current_game_date = str(row[2] or '')
    
    # Determine if season is active based on dates
    season_is_active = False
    days_until_season_end = 0
    if current_game_date and season_end_date:
        try:
            from datetime import datetime
            curr = datetime.strptime(current_game_date, '%Y%m%d')
            end = datetime.strptime(season_end_date, '%Y%m%d')
            # FIFA calendar uses June 30 as season end, but real leagues end in May.
            # Cap the effective season end to May 31 of that year.
            from datetime import date
            may_end = date(end.year, 5, 31)
            if end.date() > may_end:
                end = datetime.combine(may_end, end.time())
            start = datetime.strptime(season_start_date, '%Y%m%d') if season_start_date else curr
            season_is_active = start <= curr <= end
            days_until_season_end = max(0, (end - curr).days)
        except:
            season_is_active = True  # Assume active if we can't parse

    # --- Generate Trophies from Career Data ---
    trophies = []
    
    # Initialize cached_season_data for MOTM fallback (will be populated later in merge block)
    cached_season_data = {}
    
    # Man of the Match awards - prefer real API data, then cache, then match history
    motm_count = 0
    motm_years = []
    # Try competition_stats.json first (real API data)
    if total_motm > 0:
        motm_count = total_motm
        motm_years = [seasons[-1]['season']] if seasons else ['Current']
    # Fallback to cached season data (MOTM from previous runs)
    elif cached_season_data:
        for cs in cached_season_data.values():
            if cs.get('motm', 0) > 0:
                motm_count += cs['motm']
                motm_years.append(cs.get('season', ''))
    # Fallback to rating >= 8 from match history
    if motm_count == 0 and table_exists(conn, 'career_playermatchratinghistory'):
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM career_playermatchratinghistory WHERE playerid = ? AND rating >= 8", (player_id,))
        row = cur.fetchone()
        if row:
            motm_count = row[0]
            motm_years = [seasons[-1]['season']] if seasons else ['Current']
    
    if motm_count > 0:
        trophies.append({
            'id': 't_motm',
            'title': 'Man of the Match Awards',
            'category': 'Individual',
            'quantity': motm_count,
            'yearsWon': motm_years if motm_years else ([seasons[0]['season']] if seasons else ['Current']),
            'description': f'Awarded {motm_count} times for outstanding match performances.',
            'tier': 'Diamond' if motm_count >= 20 else 'Platinum' if motm_count >= 10 else 'Gold',
            'iconType': 'manofmatch'
        })
    
    # Golden Boot (if top scorer in any season)
    if total_goals >= 20:
        trophies.append({
            'id': 't_goldenboot',
            'title': 'European Golden Shoe',
            'category': 'Individual',
            'quantity': 1,
            'yearsWon': [f'{seasons[-1]["season"]}' if seasons else 'Current'],
            'description': 'Top goalscorer recognition with 20+ career goals.',
            'tier': 'Gold',
            'iconType': 'goldenboot'
        })
    
    # Club trophies placeholder (from season data)
    season_trophies = []
    for s in seasons:
        season_trophies.extend(s.get('trophies', []))
    
    if 'Champions League' in season_trophies:
        trophies.append({
            'id': 't_ucl',
            'title': 'UEFA Champions League',
            'category': 'Club',
            'quantity': season_trophies.count('Champions League'),
            'yearsWon': [s['season'] for s in seasons if 'Champions League' in s.get('trophies', [])],
            'description': 'The pinnacle of European club football.',
            'tier': 'Diamond',
            'iconType': 'champions'
        })
    
    league_names = ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1', 'League']
    if any(name in season_trophies for name in league_names):
        league_count = sum(season_trophies.count(name) for name in league_names)
        trophies.append({
            'id': 't_league',
            'title': 'League Champion',
            'category': 'Club',
            'quantity': league_count,
            'yearsWon': [s['season'] for s in seasons if any(name in s.get('trophies', []) for name in league_names)],
            'description': 'Domestic league title winner.',
            'tier': 'Platinum',
            'iconType': 'league'
        })
    
    # Add placeholder trophies for future wins
    if not any(t['id'] == 't_ballondor' for t in trophies):
        trophies.append({
            'id': 't_ballondor',
            'title': 'Ballon d\'Or',
            'category': 'Individual',
            'quantity': 0,
            'yearsWon': [],
            'description': 'Awarded to the world\'s best footballer.',
            'tier': 'Diamond',
            'iconType': 'ballondor'
        })
    
    if not any(t['id'] == 't_ucl' for t in trophies):
        trophies.append({
            'id': 't_ucl',
            'title': 'UEFA Champions League',
            'category': 'Club',
            'quantity': 0,
            'yearsWon': [],
            'description': 'The pinnacle of European club football.',
            'tier': 'Diamond',
            'iconType': 'champions'
        })
    
    if not any(t['id'] == 't_league' for t in trophies):
        trophies.append({
            'id': 't_league',
            'title': 'League Champion',
            'category': 'Club',
            'quantity': 0,
            'yearsWon': [],
            'description': 'Domestic league title winner.',
            'tier': 'Platinum',
            'iconType': 'league'
        })

    # Assist King (if 10+ career assists)
    if total_assists >= 10:
        trophies.append({
            'id': 't_assistking',
            'title': 'Assist King',
            'category': 'Individual',
            'quantity': 1,
            'yearsWon': [f'{seasons[-1]["season"]}' if seasons else 'Current'],
            'description': f'Elite playmaker with {total_assists} career assists.',
            'tier': 'Gold' if total_assists < 20 else 'Platinum',
            'iconType': 'assistking'
        })

    # Young Player Award (first season, age <=18, good rating)
    if seasons and len(seasons) <= 1:
        latest = seasons[0] if seasons else {}
        avg_r = float(latest.get('avgRating', 0) or 0)
        if avg_r >= 7.0:
            trophies.append({
                'id': 't_youngplayer',
                'title': 'Young Player of the Year',
                'category': 'Individual',
                'quantity': 1,
                'yearsWon': [latest.get('season', 'Current')],
                'description': f'Outstanding young talent with {avg_r:.1f} avg rating in debut season.',
                'tier': 'Gold',
                'iconType': 'youngplayer'
            })

    # Best XI (if avg rating >= 7.5)
    if seasons:
        latest = seasons[0] if seasons else {}
        avg_r = float(latest.get('avgRating', 0) or 0)
        if avg_r >= 7.5:
            trophies.append({
                'id': 't_bestxi',
                'title': 'Team of the Season',
                'category': 'Individual',
                'quantity': 1,
                'yearsWon': [latest.get('season', 'Current')],
                'description': f'Selected in the Best XI with {avg_r:.1f} average rating.',
                'tier': 'Gold',
                'iconType': 'bestxi'
            })

    # Europa League (from season trophies)
    if 'Europa League' in season_trophies:
        trophies.append({
            'id': 't_uel',
            'title': 'UEFA Europa League',
            'category': 'Club',
            'quantity': season_trophies.count('Europa League'),
            'yearsWon': [s['season'] for s in seasons if 'Europa League' in s.get('trophies', [])],
            'description': 'European club competition glory.',
            'tier': 'Platinum',
            'iconType': 'europaleague'
        })

    # Domestic Cup (from season trophies)
    cup_names = ['Coppa Italia', 'FA Cup', 'Copa del Rey', 'DFB Pokal', 'Coupe de France', 'Cup']
    cup_won = any(t in season_trophies for t in cup_names)
    if cup_won:
        cup_count = sum(season_trophies.count(t) for t in cup_names)
        trophies.append({
            'id': 't_cup',
            'title': 'Domestic Cup',
            'category': 'Club',
            'quantity': cup_count,
            'yearsWon': [s['season'] for s in seasons if any(t in s.get('trophies', []) for t in cup_names)],
            'description': 'Domestic cup competition winner.',
            'tier': 'Gold',
            'iconType': 'cup'
        })

    # --- Load League Stats (from GetPlayersStats API) ---
    league_stats_path = input_dir / 'league_stats.json'
    league_stats = {}
    if league_stats_path.exists():
        try:
            with open(league_stats_path, 'r', encoding='utf-8') as f:
                league_stats = json.load(f)
            
            # Resolve team names in standings
            if league_stats.get('competitions'):
                # Resolve competition names from FIFA IDs
                FIFA_COMP_NAMES = {
                    819: 'Premier League', 13: 'Premier League',
                    633: 'Carabao Cup', 18: 'Carabao Cup',
                    16: 'Bundesliga', 31: 'La Liga', 33: 'Serie A TIM', 56: 'Ligue 1',
                    14: 'Champions League', 15: 'Europa League', 1828: 'Pre-Season Tournament',
                    17: 'FA Cup', 19: 'Community Shield',
                }
                # Build team→competition mapping from standings
                team_to_comp = {}
                for comp in league_stats['competitions']:
                    cid = comp.get('compobjid', 0)
                    if cid in FIFA_COMP_NAMES:
                        comp['name'] = FIFA_COMP_NAMES[cid]
                    for team in comp.get('teams', []):
                        team['teamname'] = team_names.get(str(team.get('teamid', '')), f"Team {team.get('teamid', '')}")
                        team_to_comp[team.get('teamid')] = comp.get('name', 'Unknown')
                
                # Resolve player names in top scorers/assists (use Lua-provided names if available)
                for p in league_stats.get('topScorers', []):
                    if not p.get('playerName'):
                        p['playerName'] = players_by_id.get(str(p.get('playerid', '')), {}).get('commonname', '') or \
                                         players_by_id.get(str(p.get('playerid', '')), {}).get('firstname', '') + ' ' + \
                                         players_by_id.get(str(p.get('playerid', '')), {}).get('lastname', '')
                    if not p.get('teamname'):
                        p['teamname'] = team_names.get(str(p.get('teamid', '')), '')
                    # Resolve compname: first by compobjid, then by team lookup
                    if p.get('compname', '').startswith('Competition ') or not p.get('compname'):
                        resolved = FIFA_COMP_NAMES.get(p.get('compobjid', 0))
                        if not resolved:
                            resolved = team_to_comp.get(p.get('teamid'), 'Unknown')
                        p['compname'] = resolved
                
                for p in league_stats.get('topAssists', []):
                    if not p.get('playerName'):
                        p['playerName'] = players_by_id.get(str(p.get('playerid', '')), {}).get('commonname', '') or \
                                         players_by_id.get(str(p.get('playerid', '')), {}).get('firstname', '') + ' ' + \
                                         players_by_id.get(str(p.get('playerid', '')), {}).get('lastname', '')
                    if not p.get('teamname'):
                        p['teamname'] = team_names.get(str(p.get('teamid', '')), '')
                    # Resolve compname: first by compobjid, then by team lookup
                    if p.get('compname', '').startswith('Competition ') or not p.get('compname'):
                        resolved = FIFA_COMP_NAMES.get(p.get('compobjid', 0))
                        if not resolved:
                            resolved = team_to_comp.get(p.get('teamid'), 'Unknown')
                        p['compname'] = resolved
            
            print(f"  League Stats: {len(league_stats.get('competitions', []))} competitions, "
                  f"{len(league_stats.get('topScorers', []))} top scorers")
        except Exception as e:
            print(f"  Warning: Could not load league_stats.json: {e}")

    # --- Merge cached season data for completed seasons ---
    # When a new season starts, the Lua export loses previous season's rating/MOTM/competitionStats.
    # Cache completed season data so it persists across syncs.
    # Cache is keyed by player_id so new careers start fresh.
    cache_path = output_path.parent / 'season_cache.json'
    cached_season_data = {}
    cache_player_id = None
    if cache_path.exists():
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                cache_raw = json.load(f)
            # Support both formats: new (dict with player_id + seasons) and legacy (flat list)
            if isinstance(cache_raw, dict) and 'player_id' in cache_raw:
                cache_player_id = cache_raw.get('player_id')
                cached_season_list = cache_raw.get('seasons', [])
            else:
                # Legacy format: flat list of seasons, no player_id
                cached_season_list = cache_raw if isinstance(cache_raw, list) else []
            # Only use cache if player ID matches
            if cache_player_id and str(cache_player_id) != str(player_id):
                print(f"  Season cache: player changed ({cache_player_id} -> {player_id}), clearing cache")
                cached_season_data = {}
                cached_season_list = []
            else:
                cached_season_data = {s['id']: s for s in cached_season_list if isinstance(s, dict)}
        except:
            pass
    elif output_path.exists():
        # Fallback: load from previous export
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                prev_export = json.load(f)
            cached_season_data = {s['id']: s for s in prev_export.get('cached_season_data', [])}
        except:
            pass

    # Merge cached data into completed (non-latest) seasons
    # The DB only tracks league stats; cache preserves full competition totals
    if len(seasons) > 1:
        for s in seasons[:-1]:
            sid = s['id']
            if sid in cached_season_data:
                cached = cached_season_data[sid]
                # Use cached values when DB has lower/incomplete numbers
                for key in ('avgRating', 'motm', 'yellowCards', 'redCards', 'xG', 'xA',
                            'goals', 'assists', 'apps', 'highlights'):
                    db_val = s.get(key, 0) if not isinstance(s.get(key), str) else s.get(key, '')
                    cache_val = cached.get(key, 0) if not isinstance(cached.get(key), str) else cached.get(key, '')
                    if isinstance(db_val, (int, float)) and isinstance(cache_val, (int, float)):
                        if db_val == 0 and cache_val > 0:
                            s[key] = cache_val
                        elif cache_val > db_val:
                            # Cache has higher value (e.g., total includes cup stats)
                            s[key] = cache_val
                    elif isinstance(db_val, str) and not db_val and cache_val:
                        s[key] = cache_val
                if not s.get('competitionStats') and cached.get('competitionStats'):
                    s['competitionStats'] = cached['competitionStats']
                # Merge trophies: CSV trophies are source of truth, but add any from cache not in CSV
                csv_trophies = s.get('trophies', [])
                cache_trophies = cached.get('trophies', [])
                if cache_trophies and not csv_trophies:
                    s['trophies'] = cache_trophies
                elif csv_trophies and cache_trophies:
                    # Combine, avoiding duplicates
                    combined = list(csv_trophies)
                    for t in cache_trophies:
                        if t not in combined:
                            combined.append(t)
                    s['trophies'] = combined
                # individualAwards merged at end by enrich_seasons_from_cache (authoritative)

    # Save all seasons as cached data for next run (separate file to persist across rebuilds)
    # Store with player_id so we can detect career changes
    cached_season_data_list = []
    for s in seasons:
        if s.get('apps', 0) > 0:
            cached_season_data_list.append({k: v for k, v in s.items() if k != 'playerStats'})
    try:
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump({
                'player_id': str(player_id),
                'seasons': cached_season_data_list
            }, f, ensure_ascii=False, indent=2, default=str)
    except Exception as e:
        print(f"  Warning: Could not save season cache: {e}")

    # --- Update MOTM trophy from cache (authoritative source) ---
    # API doesn't persist MOTM across seasons; cache is the source of truth
    cached_motm_total = sum(cs.get('motm', 0) for cs in cached_season_data.values())
    motm_years = sorted([cs.get('season', '') for cs in cached_season_data.values() if cs.get('motm', 0) > 0])
    motm_trophy_entry = next((t for t in trophies if t.get('iconType') == 'manofmatch'), None)
    if cached_motm_total > 0:
        if motm_trophy_entry:
            # Update existing MOTM trophy with cache data
            old_qty = motm_trophy_entry.get('quantity', 0)
            motm_trophy_entry['quantity'] = cached_motm_total
            motm_trophy_entry['yearsWon'] = motm_years
            motm_trophy_entry['description'] = f'Awarded {cached_motm_total} times for outstanding match performances.'
            motm_trophy_entry['tier'] = 'Diamond' if cached_motm_total >= 20 else 'Platinum' if cached_motm_total >= 10 else 'Gold'
            if old_qty != cached_motm_total:
                print(f"  MOTM Trophy: x{old_qty} -> x{cached_motm_total} (from cache)")
        else:
            # Add new MOTM trophy
            trophies.append({
                'id': 't_motm',
                'title': 'Man of the Match Awards',
                'category': 'Individual',
                'quantity': cached_motm_total,
                'yearsWon': motm_years,
                'description': f'Awarded {cached_motm_total} times for outstanding match performances.',
                'tier': 'Diamond' if cached_motm_total >= 20 else 'Platinum' if cached_motm_total >= 10 else 'Gold',
                'iconType': 'manofmatch'
            })
            print(f"  MOTM Trophy: x{cached_motm_total} (from cache)")
    elif motm_trophy_entry and motm_trophy_entry.get('quantity', 0) > 0:
        # Cache has 0 MOTM but trophy has stale data — clear it
        old_qty = motm_trophy_entry['quantity']
        motm_trophy_entry['quantity'] = 0
        motm_trophy_entry['yearsWon'] = []
        print(f"  MOTM Trophy: x{old_qty} -> x{0} (cache cleared)")

    # --- Add individual awards from cache as trophies ---
    # The game awards things like Young Player, League XI, Assist King that our thresholds may miss
    AWARD_TO_TROPHY = {
        'Young Player of the Year': {'id': 't_youngplayer', 'title': 'Young Player of the Season', 'iconType': 'youngplayer', 'tier': 'Gold'},
        'League XI': {'id': 't_bestxi', 'title': 'League Best XI', 'iconType': 'bestxi', 'tier': 'Gold'},
        'Assist King': {'id': 't_assistking', 'title': 'Assist King', 'iconType': 'assistking', 'tier': 'Gold'},
        'Golden Boot': {'id': 't_goldenboot', 'title': 'Golden Boot', 'iconType': 'goldenboot', 'tier': 'Platinum'},
        'Player of the Season': {'id': 't_playerofseason', 'title': 'Player of the Season', 'iconType': 'playerofseason', 'tier': 'Diamond'},
    }
    for cs in cached_season_data.values():
        for award in cs.get('individualAwards', []):
            award_name = award.get('name', '') if isinstance(award, dict) else str(award)
            meta = AWARD_TO_TROPHY.get(award_name)
            if not meta:
                continue
            season_label = cs.get('season', '')
            # Find or create trophy
            existing = next((t for t in trophies if t.get('iconType') == meta['iconType']), None)
            if existing:
                if season_label not in existing.get('yearsWon', []):
                    existing['quantity'] = existing.get('quantity', 0) + 1
                    existing.setdefault('yearsWon', []).append(season_label)
            else:
                trophies.append({
                    'id': meta['id'],
                    'title': meta['title'],
                    'category': 'Individual',
                    'quantity': 1,
                    'yearsWon': [season_label],
                    'description': f'Awarded in {season_label}',
                    'tier': meta['tier'],
                    'iconType': meta['iconType'],
                })
                print(f"  Trophy: {meta['title']} x1 ({season_label} from cache)")

    # --- Final cache enrichment: pull cached data into seasons RIGHT BEFORE output ---
    # This is the authoritative merge — runs after everything else, can't be overwritten
    def enrich_seasons_from_cache(seasons_list, cache_data):
        """Copy cached motm, individualAwards, and other stats into seasons.
        Cache is the source of truth for completed seasons."""
        for s in seasons_list:
            cached = cache_data.get(s['id'])
            if not cached:
                continue
            # Always use cache values for completed season fields
            for key in ('motm', 'individualAwards', 'avgRating', 'goals', 'assists', 'apps',
                        'yellowCards', 'redCards', 'xG', 'xA', 'highlights', 'competitionStats'):
                cache_val = cached.get(key)
                if cache_val is None:
                    continue
                if key == 'individualAwards':
                    # Always prefer cache awards (game is authoritative)
                    if cache_val:
                        s[key] = cache_val
                elif key == 'competitionStats':
                    if cache_val and not s.get(key):
                        s[key] = cache_val
                else:
                    # For numeric fields: use cache if higher (cache includes cup stats)
                    current = s.get(key, 0) or 0
                    if isinstance(cache_val, (int, float)) and isinstance(current, (int, float)):
                        if current == 0 and cache_val > 0:
                            s[key] = cache_val
                        elif cache_val > current:
                            s[key] = cache_val

    enrich_seasons_from_cache(seasons, cached_season_data)

    # --- Assemble output ---
    # Get club name for profile
    club_name = club.get('teamname', 'Unknown') if club else 'Unknown'
    
    # Add currentClub to profile
    my_profile['currentClub'] = club_name

    # Add loan status to profile
    loan_info = career.get('loan') or {}
    my_profile['isOnLoan'] = loan_info.get('isOnLoan', False)
    my_profile['parentClub'] = loan_info.get('parentClubName', '')
    my_profile['parentClubId'] = loan_info.get('parentClubId', '')
    my_profile['isLoanToBuy'] = loan_info.get('isLoanToBuy', False)
    my_profile['headassetid'] = str(profile.get('headassetid', ''))
    
    output = {
        'my_player_id': str(player_id or ''),
        'my_team_id': str(club_id or ''),
        'my_player_profile': my_profile,
        'my_squad': my_squad,
        'elite_players_86_plus': elite,
        'top_scorers_by_league': top_scorers,
        'league_teams': league_teams,
        'seasons': seasons,
        'club_history': club_history,
        'post_departure': {},
        'total_goals': total_goals,
        'total_assists': total_assists,
        'total_appearances': total_apps,
        'wage': wage,
        'market_value': market_value,
        'latest_match_rating': latest_match_rating,
        'matches_played': matches_played,
        'latest_match_date': latest_match_date,
        'season_start_date': season_start_date,
        'season_end_date': season_end_date,
        'current_game_date': current_game_date,
        'season_is_active': season_is_active,
        'days_until_season_end': days_until_season_end,
        'trophies': trophies,
        'league_stats': league_stats,
        'cached_season_data': cached_season_data_list,
    }

    # --- Merge iconic moments from cached saves ---
    try:
        saves_dir = output_path.parent.parent / 'saves'
        if saves_dir.is_dir():
            player_name = my_profile.get('commonname') or my_profile.get('firstname') or ''
            safe_name = player_name.replace(' ', '_').replace('/', '_')
            # Find latest cache for this player
            matching = sorted(
                [f for f in saves_dir.iterdir()
                 if f.suffix == '.json' and not f.name.endswith('_iconic.json') and safe_name.lower() in f.stem.lower()],
                key=lambda f: f.stat().st_mtime,
                reverse=True
            )
            iconic_moments = []
            if matching:
                import json as _json
                # Check for separate iconic moments file first
                iconic_file = matching[0].with_name(matching[0].stem + '_iconic.json')
                if iconic_file.exists():
                    iconic_moments = _json.loads(iconic_file.read_text(encoding='utf-8'))
                    print(f"  Restored {len(iconic_moments)} iconic moments from: {iconic_file.name}")
                else:
                    # Fall back to iconic moments embedded in the cached export
                    cached = _json.loads(matching[0].read_text(encoding='utf-8'))
                    iconic_moments = cached.get('iconicMoments', [])
                    if iconic_moments:
                        print(f"  Restored {len(iconic_moments)} iconic moments from cache: {matching[0].name}")
            output['iconicMoments'] = iconic_moments
        else:
            output['iconicMoments'] = []
    except Exception as e:
        print(f"  Iconic moments restore failed: {e}")
        output['iconicMoments'] = []

    # --- Generate News from Data Changes ---
    try:
        news_items = generate_news(output, output_path.parent)
        output['news'] = news_items
        print(f"  News: {len(news_items)} items generated")
    except Exception as e:
        print(f"  News generation failed: {e}")
        output['news'] = []

    # --- Final pass: resolve all remaining "Competition NNN" patterns ---
    FIFA_COMP_FINAL = {
        819: 'Premier League', 13: 'Premier League',
        633: 'Carabao Cup', 18: 'Carabao Cup',
        16: 'Bundesliga', 31: 'La Liga', 33: 'Serie A TIM', 56: 'Ligue 1',
        14: 'Champions League', 15: 'Europa League', 1828: 'Pre-Season Tournament',
        17: 'FA Cup', 19: 'Community Shield',
        1411: 'LaLiga Santander', 1412: 'Copa del Rey',
    }
    import re
    comp_pattern = re.compile(r'^Competition (\d+)$')

    def resolve_comp_name(name, compobjid=None):
        """Resolve 'Competition NNN' to real name."""
        if not name:
            return name
        m = comp_pattern.match(name)
        if m:
            cid = int(m.group(1))
            return FIFA_COMP_FINAL.get(cid, name)
        return name

    def resolve_comp_in_obj(obj):
        """Recursively resolve competition names in a nested dict/list."""
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k in ('compname', 'competition', 'league') and isinstance(v, str):
                    compobjid = obj.get('compobjid') or obj.get('leagueId')
                    if isinstance(compobjid, str):
                        try:
                            compobjid = int(compobjid)
                        except:
                            compobjid = None
                    obj[k] = resolve_comp_name(v, compobjid)
                else:
                    resolve_comp_in_obj(v)
        elif isinstance(obj, list):
            for item in obj:
                resolve_comp_in_obj(item)

    resolve_comp_in_obj(output)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2, default=str)

    size_mb = output_path.stat().st_size / (1024 * 1024)

    print()
    print(f"  Squad: {len(my_squad)} teammates")
    print(f"  Seasons: {len(seasons)} ({total_goals}G / {total_assists}A in {total_apps} apps)")
    print(f"  Elite 86+: {len(elite)} players")
    for league, scorers in top_scorers.items():
        if scorers:
            print(f"  {league}: top {len(scorers)} ({scorers[0]['leaguegoals']} goals)")

    print()
    print(f"  Frontend JSON: {output_path} ({size_mb:.2f} MB)")


def generate_news(current_data: dict, base_path) -> list:
    """Generate news items for legend comparisons, milestones, and records."""
    import hashlib
    from datetime import datetime
    
    snapshot_path = base_path / 'career_snapshot.json'
    news_path = base_path / 'career_news.json'
    
    # Load previous snapshot
    prev_data = {}
    if snapshot_path.exists():
        try:
            with open(snapshot_path) as f:
                prev_data = json.load(f)
        except:
            pass
    
    # Load existing news
    existing_news = []
    if news_path.exists():
        try:
            with open(news_path) as f:
                existing_news = json.load(f)
        except:
            pass
    
    news_items = list(existing_news)
    now = datetime.now().strftime('%Y-%m-%d %H:%M')
    
    # Get player name from profile
    profile = current_data.get('my_player_profile', {})
    firstname = profile.get('firstname', '')
    lastname = profile.get('lastname', '')
    player_name = f"{firstname} {lastname}".strip() or 'Your Player'
    team_name = current_data.get('my_player_profile', {}).get('currentClub', 'Your Club')
    curr_goals = current_data.get('total_goals', 0)
    curr_assists = current_data.get('total_assists', 0)
    curr_apps = current_data.get('total_appearances', 0)
    prev_goals = prev_data.get('total_goals', 0)
    prev_assists = prev_data.get('total_assists', 0)
    
    # Legends to compare against (Hall of Fame) - with full career stats
    LEGENDS = [
        {'name': 'Cristiano Ronaldo', 'goals': 895, 'assists': 252, 'apps': 1230, 'flag': '🇵🇹', 'titles': '5x Ballon d\'Or, 5x UCL, Euro 2016'},
        {'name': 'Lionel Messi', 'goals': 838, 'assists': 374, 'apps': 1069, 'flag': '🇦🇷', 'titles': '8x Ballon d\'Or, 4x UCL, World Cup 2022'},
        {'name': 'Pelé', 'goals': 762, 'assists': 360, 'apps': 831, 'flag': '🇧🇷', 'titles': '3x World Cup, 6x Brazilian League'},
        {'name': 'Romário', 'goals': 772, 'assists': 130, 'apps': 793, 'flag': '🇧🇷', 'titles': 'World Cup 1994, 3x Brazilian League'},
        {'name': 'Robert Lewandowski', 'goals': 650, 'assists': 170, 'apps': 820, 'flag': '🇵🇱', 'titles': '2x FIFA Best, 10x Bundesliga'},
        {'name': 'Eusébio', 'goals': 621, 'assists': 110, 'apps': 637, 'flag': '🇵🇹', 'titles': 'Ballon d\'Or 1965, European Cup 1962'},
        {'name': 'Zlatan Ibrahimović', 'goals': 573, 'assists': 203, 'apps': 827, 'flag': '🇸🇪', 'titles': '12x League Champion, 4x Golden Boot'},
        {'name': 'Gerd Müller', 'goals': 566, 'assists': 102, 'apps': 607, 'flag': '🇩🇪', 'titles': 'Ballon d\'Or 1970, World Cup 1974'},
        {'name': 'Luis Suárez', 'goals': 555, 'assists': 295, 'apps': 766, 'flag': '🇺🇾', 'titles': 'Pichichi 2014, 4x La Liga'},
        {'name': 'Thierry Henry', 'goals': 411, 'assists': 206, 'apps': 908, 'flag': '🇫🇷', 'titles': 'World Cup 1998, 4x Golden Boot'},
        {'name': 'Wayne Rooney', 'goals': 366, 'assists': 188, 'apps': 763, 'flag': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'titles': '5x PL Champion, UCL 2008'},
        {'name': 'Alan Shearer', 'goals': 422, 'assists': 95, 'apps': 682, 'flag': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'titles': '3x Golden Boot, PL 1995'},
        {'name': 'Raúl', 'goals': 420, 'assists': 155, 'apps': 894, 'flag': '🇪🇸', 'titles': '3x UCL Winner, 6x La Liga'},
        {'name': 'David Villa', 'goals': 400, 'assists': 130, 'apps': 800, 'flag': '🇪🇸', 'titles': 'World Cup 2010, Golden Boot'},
        {'name': 'Samuel Eto\'o', 'goals': 435, 'assists': 140, 'apps': 690, 'flag': '🇨🇲', 'titles': '4x African POTY, 2x UCL'},
    ]
    
    def add_news(category, icon, headline, details, priority='medium', image=None):
        news_id = f'news_{hashlib.md5(headline.encode()).hexdigest()[:8]}_{now}'
        # Don't add duplicate headlines
        if any(n['headline'] == headline for n in news_items):
            return
        news_items.insert(0, {
            'id': news_id,
            'timestamp': now,
            'category': category,
            'icon': icon,
            'headline': headline,
            'details': details,
            'priority': priority,
            'image': image
        })
    
    def ordinal(n):
        """Convert number to ordinal (1st, 2nd, 3rd, etc.)"""
        if 11 <= (n % 100) <= 13:
            suffix = 'th'
        else:
            suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')
        return f"{n}{suffix}"
    
    # === LEGEND SURPASSING / TYING NEWS (SPECIAL COMPARISON) ===
    for legend in LEGENDS:
        legend_flag = legend['flag']
        
        # SURPASSED in goals
        if curr_goals > legend['goals'] and prev_goals <= legend['goals']:
            diff = curr_goals - legend['goals']
            add_news('record', '🏆',
                    f'{legend_flag} {player_name} SURPASSES {legend["name"].upper()}!',
                    f'INCREDIBLE! {player_name} ({curr_goals} goals) has overtaken the legendary {legend["name"]} ({legend["goals"]} goals) by {diff} goal(s)! '
                    f'Career comparison: {player_name} — {curr_goals}G / {curr_assists}A in {curr_apps} apps | '
                    f'{legend["name"]} — {legend["goals"]}G / {legend["assists"]}A in {legend["apps"]} apps. '
                    f'{legend["name"]}\'s honours: {legend["titles"]}. A new chapter in football history!',
                    'high', 'surpass_legend')
        
        # TIED in goals
        elif curr_goals == legend['goals'] and prev_goals < legend['goals']:
            add_news('record', '⚡',
                    f'{legend_flag} {player_name} TIES {legend["name"].upper()} AT {legend["goals"]} GOALS!',
                    f'WHAT A MOMENT! {player_name} has reached {legend["goals"]} goals, matching the great {legend["name"]}! '
                    f'Both locked at: {legend["goals"]}G / {legend["assists"]}A. '
                    f'{legend["name"]} achieved this with: {legend["titles"]}. '
                    f'Can {player_name} surpass him next? The world is watching!',
                    'high', 'tie_legend')
        
        # SURPASSED in assists
        if curr_assists > legend['assists'] and prev_assists <= legend['assists']:
            diff = curr_assists - legend['assists']
            add_news('record', '🅰️',
                    f'{legend_flag} {player_name} SURPASSES {legend["name"].upper()} IN ASSISTS!',
                    f'PLAYMAKING GREATNESS! {player_name} ({curr_assists} assists) has overtaken {legend["name"]} ({legend["assists"]} assists) by {diff}! '
                    f'Career: {curr_goals}G / {curr_assists}A vs {legend["goals"]}G / {legend["assists"]}A. '
                    f'{legend["name"]} was known for: {legend["titles"]}. '
                    f'{player_name} writes his own legacy!',
                    'high', 'surpass_legend')
        
        # TIED in assists
        elif curr_assists == legend['assists'] and prev_assists < legend['assists']:
            add_news('record', '🤝',
                    f'{legend_flag} {player_name} TIES {legend["name"].upper()} AT {legend["assists"]} ASSISTS!',
                    f'MATCHED! {player_name} reaches {legend["assists"]} assists, level with {legend["name"]}! '
                    f'Both at: {curr_goals}G / {legend["assists"]}A. '
                    f'{legend["name"]}\'s legacy: {legend["titles"]}. '
                    f'The next assist puts {player_name} ahead!',
                    'high', 'tie_legend')
    
    # === GOAL MILESTONES (50, 100, 150, 200+) ===
    goal_milestones = {
        50: ('⭐', 'GOAL MILESTONE: 50 CAREER GOALS!', 'Half a century of brilliance! The journey continues!'),
        100: ('💎', 'GOAL MILESTONE: 100 CAREER GOALS!', 'CENTURION! Three figures! A true legend in the making!'),
        150: ('👑', 'GOAL MILESTONE: 150 CAREER GOALS!', 'IMMORTAL TERRITORY! Among the greatest to ever play!'),
        200: ('🐐', 'GOAL MILESTONE: 200 CAREER GOALS!', 'LEGENDARY! 200 goals! The GREATEST OF ALL TIME debate is ON!'),
        250: ('🏆', 'GOAL MILESTONE: 250 CAREER GOALS!', 'QUARTER THOUSAND! Utterly unstoppable!'),
        300: ('🌟', 'GOAL MILESTONE: 300 CAREER GOALS!', 'THREE HUNDRED! Football immortality secured!'),
    }
    
    for milestone, (icon, headline, detail) in goal_milestones.items():
        if curr_goals >= milestone and prev_goals < milestone:
            add_news('milestone', icon, f'{player_name}: {headline}',
                    f'{detail} Currently at {curr_goals} goals, {curr_assists} assists in {curr_apps} appearances.',
                    'high', 'milestone')
    
    # === ASSIST MILESTONES (50, 100, 150, 200+) ===
    assist_milestones = {
        50: ('🎯', 'ASSIST MILESTONE: 50 CAREER ASSISTS!', 'The maestro delivers! Half a century of key passes!'),
        100: ('🔥', 'ASSIST MILESTONE: 100 CAREER ASSISTS!', 'CENTURION OF CREATIVITY! 100 times the architect!'),
        150: ('👑', 'ASSIST MILESTONE: 150 CAREER ASSISTS!', 'CREATIVE GENIUS! 150 assists! Visionary football!'),
        200: ('🐐', 'ASSIST MILESTONE: 200 CAREER ASSISTS!', 'TWO HUNDRED ASSISTS! The greatest playmaker ever!'),
    }
    
    for milestone, (icon, headline, detail) in assist_milestones.items():
        if curr_assists >= milestone and prev_assists < milestone:
            add_news('milestone', icon, f'{player_name}: {headline}',
                    f'{detail} Currently at {curr_goals} goals, {curr_assists} assists in {curr_apps} appearances.',
                    'high', 'milestone')
    
    # === APPEARANCE MILESTONES ===
    app_milestones = {
        50: ('👕', 'APPEARANCE MILESTONE: 50 GAMES!', 'Established first-team player! Consistency is key!'),
        100: ('💪', 'APPEARANCE MILESTONE: 100 GAMES!', 'Century of service! A club legend in the making!'),
        200: ('🏆', 'APPEARANCE MILESTONE: 200 GAMES!', 'Two hundred appearances! Loyalty and excellence combined!'),
    }
    
    prev_apps = prev_data.get('total_appearances', 0)
    for milestone, (icon, headline, detail) in app_milestones.items():
        if curr_apps >= milestone and prev_apps < milestone:
            add_news('career', icon, f'{player_name}: {headline}',
                    f'{detail} Currently at {curr_goals}G / {curr_assists}A in {curr_apps} apps.',
                    'medium', 'milestone')
    
    # === RATING MILESTONES ===
    curr_ovr = int(current_data.get('my_player_profile', {}).get('overallrating', 0))
    prev_ovr = int(prev_data.get('my_player_profile', {}).get('overallrating', 0))
    if curr_ovr > prev_ovr and prev_ovr > 0:
        if curr_ovr >= 80:
            add_news('growth', '🌟', f'{player_name} reaches {curr_ovr} OVR — ELITE STATUS!',
                    f'From promising youngster to world-class! {player_name} is now rated {curr_ovr} overall!',
                    'high', 'rating')
        elif curr_ovr >= 70:
            add_news('growth', '📈', f'{player_name} improves to {curr_ovr} OVR!',
                    f'Hard work paying off. {player_name} continues to develop as a player.',
                    'medium', 'rating')
    
    # === MARKET VALUE JUMPS ===
    curr_value = current_data.get('market_value', 0)
    prev_value = prev_data.get('market_value', 0)
    if curr_value > prev_value and prev_value > 0:
        increase = ((curr_value - prev_value) / prev_value) * 100
        if increase >= 20:
            add_news('transfer', '💰', f'{player_name} now worth €{curr_value/1000000:.1f}M!',
                    f'VALUE SKYROCKETS! Market value surged by {increase:.0f}%! Top clubs will be watching.',
                    'high', 'value')
    
    # === CLUB-BASED LEGEND COMPARISONS ===
    # Legends and their famous clubs
    CLUB_LEGENDS = {
        'Real Madrid': [
            {'name': 'Cristiano Ronaldo', 'flag': '🇵🇹', 'years': '2009-2018', 'goals': 451, 'honours': '4x UCL, 2x La Liga, 4x Ballon d\'Or'},
            {'name': 'Raúl', 'flag': '🇪🇸', 'years': '1994-2010', 'goals': 323, 'honours': '3x UCL, 6x La Liga'},
            {'name': 'Alfredo Di Stéfano', 'flag': '🇦🇷', 'years': '1953-1964', 'goals': 308, 'honours': '5x European Cup, 8x La Liga'},
        ],
        'FC Barcelona': [
            {'name': 'Lionel Messi', 'flag': '🇦🇷', 'years': '2004-2021', 'goals': 672, 'honours': '4x UCL, 10x La Liga, 8x Ballon d\'Or'},
            {'name': 'Luis Suárez', 'flag': '🇺🇾', 'years': '2014-2020', 'goals': 198, 'honours': '1x UCL, 4x La Liga, Pichichi 2016'},
            {'name': 'Rivaldo', 'flag': '🇧🇷', 'years': '1997-2002', 'goals': 130, 'honours': '1x UCL, 2x La Liga, Ballon d\'Or 1999'},
        ],
        'Manchester United': [
            {'name': 'Wayne Rooney', 'flag': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'years': '2004-2017', 'goals': 253, 'honours': '5x PL, 1x UCL, Club\'s all-time top scorer'},
            {'name': 'Cristiano Ronaldo', 'flag': '🇵🇹', 'years': '2003-2009', 'goals': 118, 'honours': '1x UCL, 3x PL, 1st Ballon d\'Or'},
            {'name': 'Eric Cantona', 'flag': '🇫🇷', 'years': '1992-1997', 'goals': 82, 'honours': '4x PL, 2x FA Cup, King of Old Trafford'},
        ],
        'Juventus': [
            {'name': 'Alessandro Del Piero', 'flag': '🇮🇹', 'years': '1993-2012', 'goals': 290, 'honours': '1x UCL, 9x Serie A, Club legend'},
            {'name': 'Roberto Baggio', 'flag': '🇮🇹', 'years': '1990-1995', 'goals': 115, 'honours': '1x Serie A, Ballon d\'Or 1993 nominee'},
        ],
        'AC Milan': [
            {'name': 'Andriy Shevchenko', 'flag': '🇺🇦', 'years': '1999-2006', 'goals': 175, 'honours': '1x UCL, 1x Serie A, Ballon d\'Or 2004'},
            {'name': 'Kaká', 'flag': '🇧🇷', 'years': '2003-2009', 'goals': 104, 'honours': '1x UCL, 1x Serie A, Ballon d\'Or 2007'},
        ],
        'Inter Milan': [
            {'name': 'Javier Zanetti', 'flag': '🇦🇷', 'years': '1995-2014', 'goals': 30, 'honours': '1x UCL, 5x Serie A, 858 appearances'},
            {'name': 'Ronaldo Nazário', 'flag': '🇧🇷', 'years': '1997-2002', 'goals': 59, 'honours': '1x UEFA Cup, 1x Serie A'},
        ],
        'Bayern Munich': [
            {'name': 'Robert Lewandowski', 'flag': '🇵🇱', 'years': '2014-2022', 'goals': 344, 'honours': '1x UCL, 10x Bundesliga, 2x FIFA Best'},
            {'name': 'Gerd Müller', 'flag': '🇩🇪', 'years': '1964-1979', 'goals': 564, 'honours': '1x European Cup, 4x Bundesliga, Ballon d\'Or 1970'},
        ],
        'Liverpool': [
            {'name': 'Mohamed Salah', 'flag': '🇪🇬', 'years': '2017-Pres', 'goals': 211, 'honours': '1x UCL, 1x PL, 3x Golden Boot'},
            {'name': 'Steven Gerrard', 'flag': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'years': '1998-2015', 'goals': 186, 'honours': '1x UCL, 1x FA Cup, Club legend'},
        ],
        'Arsenal': [
            {'name': 'Thierry Henry', 'flag': '🇫🇷', 'years': '1999-2007', 'goals': 228, 'honours': '1x UCL Final, 2x PL, 4x Golden Boot'},
            {'name': 'Dennis Bergkamp', 'flag': '🇳🇱', 'years': '1995-2006', 'goals': 120, 'honours': '3x PL, 4x FA Cup, Invincible 2004'},
        ],
        'Chelsea': [
            {'name': 'Didier Drogba', 'flag': '🇨🇮', 'years': '2004-2012', 'goals': 164, 'honours': '1x UCL, 4x PL, UCL Final hero 2012'},
            {'name': 'Frank Lampard', 'flag': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'years': '2001-2014', 'goals': 211, 'honours': '1x UCL, 3x PL, Club\'s all-time top scorer'},
        ],
        'Paris Saint-Germain': [
            {'name': 'Kylian Mbappé', 'flag': '🇫🇷', 'years': '2017-2024', 'goals': 254, 'honours': '1x World Cup, 6x Ligue 1, 4x Golden Boot'},
        ],
        'Atletico Madrid': [
            {'name': 'Antoine Griezmann', 'flag': '🇫🇷', 'years': '2014-2019, 2022-Pres', 'goals': 150, 'honours': '1x Europa League, 1x La Liga'},
        ],
        'Napoli': [
            {'name': 'Diego Maradona', 'flag': '🇦🇷', 'years': '1984-1991', 'goals': 115, 'honours': '1x UEL, 2x Serie A, Club\'s greatest ever'},
        ],
        'Spezia': [
            {'name': 'Gianluca Vialli', 'flag': '🇮🇹', 'years': '1980-1984', 'goals': 35, 'honours': 'Serie B promotion, Club legend'},
        ],
    }

    # Check if player moved clubs
    curr_club = current_data.get('my_player_profile', {}).get('currentClub', '')
    prev_club = prev_data.get('my_player_profile', {}).get('currentClub', '')
    
    if curr_club and prev_club and curr_club != prev_club:
        # Player transferred - check for legend connections
        if curr_club in CLUB_LEGENDS:
            for legend in CLUB_LEGENDS[curr_club]:
                add_news('transfer', '🔄',
                        f'{player_name} JOINS {curr_club.upper()} — Following in {legend["name"]}\'s footsteps!',
                        f'{player_name} has signed for {curr_club}! The great {legend["name"]} ({legend["flag"]}) played here from {legend["years"]}, '
                        f'scoring {legend["goals"]} goals. His honours: {legend["honours"]}. '
                        f'Can {player_name} match or surpass that legacy? The journey begins now!',
                        'high', 'club_legend')
        
        # Also check old club
        if prev_club in CLUB_LEGENDS:
            for legend in CLUB_LEGENDS[prev_club][:1]:  # Only top legend
                add_news('career', '👋',
                        f'{player_name} BIDS FAREWELL TO {prev_club.upper()}',
                        f'{player_name} leaves {prev_club}, where {legend["name"]} ({legend["flag"]}) once starred. '
                        f'Legacy at {prev_club}: {curr_goals}G / {curr_assists}A. New chapter awaits!',
                        'medium', 'departure')

    # === START OF SEASON NEWS / DEBATE ===
    # Generate "Can he do it?" headlines when a new season starts
    all_seasons = current_data.get('seasons', [])
    if all_seasons and len(all_seasons) >= 2:
        latest_season = all_seasons[-1]
        prev_season = all_seasons[-2] if len(all_seasons) >= 2 else None
        
        # New season = latest season has 0 apps
        if latest_season.get('apps', 0) == 0 and prev_season and prev_season.get('apps', 0) > 0:
            prev_goals = prev_season.get('goals', 0)
            prev_assists = prev_season.get('assists', 0)
            prev_rating = prev_season.get('avgRating', 0)
            prev_apps = prev_season.get('apps', 0)
            prev_awards = prev_season.get('individualAwards', [])
            prev_club = prev_season.get('club', '')
            curr_club = latest_season.get('club', '')
            new_club = curr_club != prev_club
            
            award_names = [a.get('name', '') for a in prev_awards] if prev_awards else []
            award_text = ', '.join(award_names) if award_names else None
            
            # --- Season summary headline ---
            summary_parts = []
            if prev_goals > 0:
                summary_parts.append(f'{prev_goals} goals')
            if prev_assists > 0:
                summary_parts.append(f'{prev_assists} assists')
            if prev_rating > 0:
                summary_parts.append(f'{prev_rating:.2f} avg rating')
            summary_stats = ', '.join(summary_parts) if summary_parts else f'{prev_apps} appearances'
            
            # --- Main "Can he do it?" headline ---
            if new_club:
                add_news('season_preview', '🏟️',
                        f'NEW SEASON: Can {player_name} replicate his form at {curr_club}?',
                        f'{player_name} joins {curr_club} after a stellar {prev_season.get("season", "")} at {prev_club} — '
                        f'{summary_stats} in {prev_apps} appearances'
                        + (f', winning {award_text}.' if award_text else '.')
                        + f'\n\nThe big question: Can he do it again in the Premier League? '
                        f'Fans debate whether the youngster can maintain his trajectory at a bigger club. '
                        f'The pressure is on. The stage is set.',
                        'high', 'season_preview')
            else:
                add_news('season_preview', '🏟️',
                        f'NEW SEASON PREVIEW: Can {player_name} go even better?',
                        f'After {summary_stats} in {prev_apps} appearances'
                        + (f' and winning {award_text}' if award_text else '')
                        + f' last season, all eyes are on {player_name}. '
                        f'\n\n pundits are split — some say he\'ll kick on, others question if it was a one-season wonder. '
                        f'One thing is certain: the expectations have never been higher.',
                        'high', 'season_preview')
            
            # --- Award-specific headlines ---
            if award_text:
                # Young Player of the Year
                if any('Young Player' in a for a in award_names):
                    add_news('season_preview', '🌟',
                            f'Can {player_name} defend his Young Player of the Year crown?',
                            f'{player_name} won Young Player of the Year with {prev_goals}G / {prev_assists}A at {prev_club}. '
                            f'At {profile.get("age", 18) + 1}, he\'s now a year older — but the competition is fiercer. '
                            f'Former winners who kicked on: Mbappé, Haaland, Foden. '
                            f'Those who faded: countless others. The jury is out.',
                            'high', 'season_preview')
                
                # Assist King
                if any('Assist King' in a for a in award_names):
                    add_news('season_preview', '🅰️',
                            f'Assist King {player_name}: One-season wonder or the real deal?',
                            f'{player_name} led the league with {prev_assists} assists last season — '
                            f'better than any midfielder in the division. '
                            f'Critics say it\'s easier to rack up assists at a small club like {prev_club}. '
                            f'Fans argue the numbers don\'t lie. Now at {curr_club}, the debate intensifies. '
                            f'Can he be the creative heartbeat of a top club?',
                            'high', 'season_preview')
                
                # League XI
                if any('League XI' in a or 'Best XI' in a for a in award_names):
                    add_news('season_preview', '⚽',
                            f'{player_name} named in League XI — but can he reach World XI level?',
                            f'A place in the League XI confirms {player_name} was one of the best in his position. '
                            f'But the gap between domestic dominance and global recognition is massive. '
                            f'Players like Bellingham and Pedri have set the bar. '
                            f'{player_name} needs to show he belongs in that conversation.',
                            'medium', 'season_preview')
            
            # --- "Can he improve?" statistical comparison ---
            # Generate comparison based on age trajectory
            age = profile.get('age', 18)
            if prev_goals >= 10:
                target_goals = prev_goals + 5
                add_news('season_preview', '📊',
                        f'STATS DEBATE: {player_name} needs {target_goals} goals to silence the doubters',
                        f'After {prev_goals}G / {prev_assists}A last season, the stats say {player_name} is on an upward curve. '
                        f'But at {age + 1}, the next step is the hardest. '
                        f'\n\nFan poll: Will he reach {target_goals} goals this season? '
                        f'\n• "Easily — he\'s only 16, the sky\'s the limit" ⬆️'
                        f'\n• "Unlikely — the Premier League is a different beast" ⬇️'
                        f'\n• "He\'ll get close but fall short" ➡️'
                        f'\n\nThe numbers from last season suggest he can. The doubters say otherwise.',
                        'high', 'season_preview')
            
            if prev_rating >= 7.5:
                add_news('season_preview', '⭐',
                        f'RATE HIM: {player_name}\'s {prev_rating:.2f} rating — world-class in the making?',
                        f'An average rating of {prev_rating:.2f} puts {player_name} in elite company. '
                        f'For reference: De Bruyne averages 8.1, Bellingham 7.9, Pedri 7.7. '
                        f'\nBut ratings at a smaller club don\'t always translate. '
                        f'The question isn\'t whether he\'s good — it\'s whether he\'s THAT good.',
                        'medium', 'season_preview')
            
            # --- Fan reaction mock quotes ---
            fan_quotes = [
                f'"{player_name} was the best player at {prev_club} by a mile. Can he do it at a big club? I think yes." — @BlueFan_{age}',
                f'"Everyone\'s hyping {player_name} but let\'s see him do it in the Champions League first." — @SkepticFC',
                f'"15 goals and {prev_assists} assists at 15 years old? This kid is SPECIAL." — @YouthAcademy',
                f'"{curr_club} paid a premium but if he delivers, it\'ll be a steal." — @TransferGuru',
            ]
            add_news('season_preview', '💬',
                    f'FAN REACTION: Split opinions on {player_name}\'s new season',
                    '\n'.join(fan_quotes) +
                    f'\n\nThe debate rages on. One thing is clear: all eyes are on {player_name} this season.',
                    'medium', 'season_preview')
    
    # === PERFORMANCE-BASED LEGEND COMPARISONS ===
    # Check for single-match achievements that mirror legends
    seasons = current_data.get('seasons', [])
    if seasons:
        latest_season = seasons[-1] if seasons else {}
        season_goals = latest_season.get('goals', 0)
        season_assists = latest_season.get('assists', 0)
        
        # Hat-trick milestone (3+ goals in a season for a winger is exceptional)
        if season_goals >= 3 and prev_goals < curr_goals:
            # Compare to Henry's early career
            if curr_goals >= 10 and curr_goals <= 50:
                add_news('performance', '⚡',
                        f'{player_name} matching Thierry Henry\'s early trajectory!',
                        f'With {curr_goals} career goals at age {profile.get("age", 18)}, {player_name} is on a similar path to '
                        f'Thierry Henry, who had 15 goals in his first full season at Monaco. The French legend went on to score 411 career goals. '
                        f'Keep this up and {player_name} could reach similar heights!',
                        'medium', 'legend_comparison')
        
        # Creators milestone - compare to Bergkamp/Zidane
        if season_assists >= 5 and curr_assists >= 10:
            add_news('performance', '🎨',
                    f'{player_name}\'s creativity rivals Dennis Bergkamp!',
                    f'With {curr_assists} career assists, {player_name} is showing the vision and passing ability that made '
                    f'Dennis Bergkamp a legend. The Dutch maestro had 120 goals and countless assists in his Arsenal career. '
                        f'{player_name} is building a similar legacy of beautiful football!',
                        'medium', 'legend_comparison')

    # === DYNAMIC MATCH RATING NEWS ===
    match_rating = current_data.get('latest_match_rating', 0)
    prev_match_rating = prev_data.get('latest_match_rating', 0)
    
    if match_rating > 0 and match_rating != prev_match_rating:
        # Outstanding performance (9.0+)
        if match_rating >= 9:
            add_news('performance', '⭐',
                    f'{player_name} delivers MASTERCLASS performance! Rating: {match_rating}.0!',
                    f'What a performance! {player_name} received a {match_rating}.0 match rating — '
                    f'world-class display! With {curr_goals} goals and {curr_assists} assists in {curr_apps} appearances, '
                    f'the youngster continues to impress. The football world is taking notice!',
                    'high', 'match_rating')
        
        # Good performance (7.5-8.9)
        elif match_rating >= 7.5:
            add_news('performance', '👍',
                    f'{player_name} puts in solid shift — Rating: {match_rating}.0',
                    f'Consistent from {player_name}! A {match_rating}.0 rating shows the quality is there. '
                    f'Season stats: {curr_goals}G / {curr_assists}A in {curr_apps} apps. '
                    f'The foundation is being built game by game.',
                    'medium', 'match_rating')
        
        # Average performance (6.5-7.4)
        elif match_rating >= 6.5:
            add_news('performance', '📊',
                    f'{player_name} with workmanlike display — Rating: {match_rating}.0',
                    f'Not every game can be a masterpiece. {player_name} earned a {match_rating}.0 rating. '
                    f'Career: {curr_goals}G / {curr_assists}A in {curr_apps} apps. '
                    f'The great ones bounce back stronger.',
                    'low', 'match_rating')
        
        # Poor performance (6.0-6.4) - struggles
        elif match_rating >= 6:
            add_news('performance', '⚠️',
                    f'{player_name} struggles in latest outing — Rating: {match_rating}.0',
                    f'A difficult match for {player_name}. The {match_rating}.0 rating reflects a below-par display. '
                    f'Critics will pounce, but champions use setbacks as fuel. '
                    f'Career: {curr_goals}G / {curr_assists}A. Time to respond.',
                    'medium', 'match_rating')
        
        # Very poor performance (below 6.0) - nightmare
        else:
            add_news('performance', '🚨',
                    f'{player_name} has NIGHTMARE performance — Rating: {match_rating}.0!',
                    f'Concerning display from {player_name}. A {match_rating}.0 rating is unacceptable '
                    f'for a player with {curr_goals} goals and {curr_assists} assists. '
                    f'The pressure is mounting. Can he recover his form?',
                    'high', 'match_rating')

    # === FORM ANALYSIS (based on recent stats trajectory) ===
    curr_avg_rating = 0
    if seasons:
        latest_season = seasons[-1] if seasons else {}
        curr_avg_rating = float(latest_season.get('avgRating', 0))
    
    prev_avg_rating = 0
    if prev_data.get('seasons'):
        prev_season = prev_data['seasons'][-1] if prev_data['seasons'] else {}
        prev_avg_rating = float(prev_season.get('avgRating', 0))
    
    # Hot streak (improving average rating)
    if curr_avg_rating > 0 and prev_avg_rating > 0:
        rating_diff = curr_avg_rating - prev_avg_rating
        
        if rating_diff >= 0.5:
            add_news('form', '🔥',
                    f'{player_name} is on FIRE! Average rating surging!',
                    f'Average rating jumped from {prev_avg_rating:.1f} to {curr_avg_rating:.1f}! '
                    f'{player_name} is hitting top form at the right time. '
                    f'With {curr_goals}G / {curr_assists}A, the numbers back it up. '
                    f'Is this the start of something special?',
                    'high', 'form')
        
        elif rating_diff >= 0.2:
            add_news('form', '📈',
                    f'{player_name} finding his feet — form improving!',
                    f'Average rating climbing: {prev_avg_rating:.1f} → {curr_avg_rating:.1f}. '
                    f'Quietly building momentum. {curr_goals}G / {curr_assists}A in {curr_apps} apps. '
                    f'The consistency is there.',
                    'medium', 'form')
        
        # Cold streak (declining average rating)
        elif rating_diff <= -0.5:
            add_news('form', '❄️',
                    f'{player_name} in DROPOFF — form concerns grow!',
                    f'Average rating fallen from {prev_avg_rating:.1f} to {curr_avg_rating:.1f}. '
                    f'The numbers are declining. {curr_goals}G / {curr_assists}A but the trajectory worries fans. '
                    f'Can {player_name} rediscover his best?',
                    'high', 'form')
        
        elif rating_diff <= -0.2:
            add_news('form', '📉',
                    f'{player_name} searching for form — slight dip in performance',
                    f'Average rating slipped: {prev_avg_rating:.1f} → {curr_avg_rating:.1f}. '
                    f'Sometimes football tests you. {curr_goals}G / {curr_assists}A remains solid. '
                    f'Back to the training ground.',
                    'medium', 'form')

    # === GOAL DROUGHT / SCORING RUNS ===
    if curr_goals == prev_goals and curr_apps > prev_apps:
        games_without_goal = curr_apps - prev_apps
        if games_without_goal >= 5:
            add_news('form', '干旱',
                    f'{player_name} without a goal in {games_without_goal} games!',
                    f'The drought continues. {player_name} hasn\'t scored in {games_without_goal} appearances. '
                    f'Career: {curr_goals}G / {curr_assists}A. '
                    f'Strikers go through these spells. The next goal could unlock everything.',
                    'medium', 'drought')
    
    # Scoring streak (goals increasing faster than appearances)
    if curr_goals > prev_goals and curr_apps == prev_apps:
        add_news('form', '⚡',
                f'{player_name} finds the net again! Confidence booster!',
                f'Back among the goals! {player_name} adds to his tally. '
                f'Career: {curr_goals}G / {curr_assists}A in {curr_apps} apps. '
                f'Momentum building!',
                'low', 'scoring')

    # Keep only last 30 unique news items
    seen = set()
    unique_news = []
    for item in news_items:
        if item['id'] not in seen:
            seen.add(item['id'])
            unique_news.append(item)
    news_items = unique_news[:30]
    
    # Save snapshot
    try:
        with open(snapshot_path, 'w') as f:
            json.dump(current_data, f, indent=2, default=str)
    except:
        pass
    
    # Save news
    try:
        with open(news_path, 'w') as f:
            json.dump(news_items, f, indent=2, default=str)
    except:
        pass
    
    return news_items


# ============================================================
# MAIN PIPELINE
# ============================================================

def main():

    parser = argparse.ArgumentParser(
        description=(
            "Convert FIFA career CSV files "
            "to SQLite and generate a "
            "resolved JSON export."
        )
    )

    parser.add_argument(
        "--input-dir",
        required=True,
        help="Directory containing FIFA CSV files"
    )

    parser.add_argument(
        "--output-db",
        required=True,
        help="SQLite output path"
    )

    parser.add_argument(
        "--output-json",
        required=True,
        help="JSON output path"
    )

    parser.add_argument(
        "--schema",
        default=None,
        help="Optional career_schema.json"
    )

    parser.add_argument(
        "--include-raw",
        action="store_true",
        help=(
            "Embed every raw SQLite table "
            "inside the JSON. "
            "This can make the JSON very large."
        )
    )

    parser.add_argument(
        "--output-frontend",
        default=None,
        help=(
            "Also generate a frontend-compatible JSON "
            "for the React career tracker. "
            "If not specified, derives from --output-json "
            "by replacing _export with _frontend."
        )
    )

    args = parser.parse_args()

    input_dir = Path(
        args.input_dir
    )

    output_db = Path(
        args.output_db
    )

    output_json = Path(
        args.output_json
    )

    # Derive frontend JSON path
    if args.output_frontend:
        output_frontend = Path(args.output_frontend)
    else:
        # Replace _export with _frontend in the json name
        output_frontend = output_json.parent / output_json.name.replace('_export', '_frontend')

    # --------------------------------------------------------
    # VALIDATE INPUT
    # --------------------------------------------------------

    if not input_dir.is_dir():

        print(
            f"ERROR: {input_dir} "
            f"is not a directory."
        )

        sys.exit(1)

    csv_files = sorted(
        input_dir.glob("*.csv")
    )

    if not csv_files:

        print(
            f"ERROR: no CSV files found "
            f"in {input_dir}"
        )

        sys.exit(1)

    # --------------------------------------------------------
    # LOAD SCHEMA
    # --------------------------------------------------------

    schema = load_schema(
        args.schema
    )

    # --------------------------------------------------------
    # REMOVE OLD OUTPUT DATABASE
    # --------------------------------------------------------

    if output_db.exists():

        print(
            f"Removing existing database: "
            f"{output_db}"
        )

        output_db.unlink()

    # --------------------------------------------------------
    # CREATE SQLITE
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("CREATING CAREER DATABASE")
    print("=" * 60)

    conn = sqlite3.connect(
        str(output_db)
    )

    try:

        total_files, imported, total_rows = (
            import_all_csvs(
                input_dir,
                conn,
                schema
            )
        )

        print()
        print(
            f"Imported "
            f"{imported}/{total_files} tables"
        )

        print(
            f"Total rows: "
            f"{total_rows:,}"
        )

        # ----------------------------------------------------
        # GENERATE JSON FROM SAME SQLITE DATABASE
        # ----------------------------------------------------

        generate_json(
            conn,
            output_json,
            include_raw=args.include_raw
        )

        # ----------------------------------------------------
        # GENERATE FRONTEND-COMPATIBLE JSON
        # ----------------------------------------------------

        generate_frontend_json(
            conn,
            output_frontend,
            input_dir
        )

    finally:

        conn.close()

    # --------------------------------------------------------
    # FINAL SUMMARY
    # --------------------------------------------------------

    db_size_mb = (
        output_db.stat().st_size
        / (1024 * 1024)
    )

    json_size_mb = (
        output_json.stat().st_size
        / (1024 * 1024)
    )

    print()
    print("=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)

    print(
        f"SQLite: "
        f"{output_db} "
        f"({db_size_mb:.2f} MB)"
    )

    print(
        f"JSON:   "
        f"{output_json} "
        f"({json_size_mb:.2f} MB)"
    )

    frontend_size_mb = output_frontend.stat().st_size / (1024 * 1024) if output_frontend.exists() else 0
    print(
        f"Frontend: "
        f"{output_frontend} "
        f"({frontend_size_mb:.2f} MB)"
    )

    # Auto-copy to codebase — src/data (adapter static import) AND public (fetch fallback)
    import shutil
    # Use absolute path for codebase (works when run from Wine prefix too)
    codebase_base = Path("/home/Games/FIFA 23/Player_career/Codebase")
    codebase_src = codebase_base / "src" / "data" / "career_export.json"
    codebase_pub = codebase_base / "public" / "career_export.json"
    if output_frontend.exists():
        if codebase_src.parent.exists():
            shutil.copy2(str(output_frontend), str(codebase_src))
            print(f"\n  -> Copied to {codebase_src}")
        if codebase_pub.parent.exists():
            shutil.copy2(str(output_frontend), str(codebase_pub))
        print("     Frontend will pick it up on next page load.")

    print()
    print("You now have:")

    print(
        "  1. Complete SQLite database"
    )

    print(
        "  2. Resolved JSON career dataset"
    )

    print(
        "  3. Frontend-compatible JSON"
    )

    print(
        "  4. Auto-copied to Codebase/src/data/"
    )

    print(
        "  5. Player ID -> name mappings"
    )

    print(
        "  6. Player -> team mappings"
    )

    print(
        "  7. Team -> league mappings"
    )

    print(
        "  8. Current career player/club"
    )


if __name__ == "__main__":
    main()
