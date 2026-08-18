-- ============================================================
-- FIFA 23 CAREER MODE - MASTER EXPORT SCRIPT
-- ============================================================
-- Exports everything in one go:
--   1. All career CSVs (database tables)
--   2. Per-competition stats for your player
--   3. League-wide stats (filtered to your competitions)
--   4. Player name (via GetPlayerName API)
--
-- Run this single script in Live Editor Lua Engine.
-- Then run 'career.sh --sync' in terminal.
-- ============================================================

local output_dir = "C:\\FIFA 23 Live Editor\\career_data\\"
local player_id = 30999  -- Your player ID (change this when switching players)

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

local function csv_escape(s)
    s = tostring(s)
    if s:find('[,"\n\r]') then
        s = '"' .. s:gsub('"', '""') .. '"'
    end
    return s
end

local function json_escape(s)
    s = tostring(s)
    s = s:gsub('\\', '\\\\')
    s = s:gsub('"', '\\"')
    return s
end

local function log(msg)
    Log(msg)
end

-- Known competition mappings (FIFA 23)
local COMP_NAMES = {
    [1097] = "Serie A TIM",
    [1045] = "Coppa Italia",
    [1828] = "Pre-Season Tournament",
    [179] = "UEFA Europa League",
    [10] = "Bundesliga",
    [13] = "Premier League",
    [31] = "La Liga",
    [56] = "Ligue 1",
    [14] = "Eredivisie",
    [16] = "Liga Portugal",
    [33] = "Champions League",
    [1829] = "UEFA Super Cup",
    [2020] = "FIFA World Cup",
    [2021] = "World Cup Qualifiers",
    [2022] = "Nations League",
    [1411] = "LaLiga Santander",
    [1412] = "Copa del Rey",
}

local function get_comp_name(compobjid)
    -- Try known names first
    if COMP_NAMES[compobjid] then
        return COMP_NAMES[compobjid]
    end
    -- Try API
    local ok, name = pcall(GetCompetitionNameByObjID, compobjid)
    if ok and name and name ~= "" and not name:find("COBJ") then
        return name
    end
    return "Competition " .. compobjid
end

local function get_team_name(teamid)
    local ok, name = pcall(GetTeamName, teamid)
    if ok and name and name ~= "" then
        return name
    end
    return "Team " .. teamid
end

local function get_player_name(pid)
    local ok, name = pcall(GetPlayerName, pid)
    if ok and name and name ~= "" then
        return name
    end
    return "Player " .. pid
end

-- Check if team is in user's league (Serie A teams)
-- This filters out international/European/random competitions
local function is_team_in_user_league(teamid)
    -- Get user's team league
    local user_team = GetUserTeamID()
    if teamid == user_team then return true end
    
    -- Check if team plays in same league as user
    -- We'll use a simpler approach: only include competitions where user's team has players
    return true  -- Will filter later based on competition relevance
end

-- ============================================================
-- MAIN
-- ============================================================

if not IsInCM() then
    MessageBox("Error", "Not in Career Mode. Load your career save first.")
    return
end

log("============================================================")
log("FIFA 23 MASTER EXPORT - Starting...")
log("============================================================")

local user_teamid = GetUserTeamID()
log("User Team ID: " .. user_teamid)
log("Player ID: " .. player_id)

-- Get current date
local current_date = GetCurrentDate()
local date_str = string.format("%02d/%02d/%04d", current_date.day, current_date.month, current_date.year)
log("Current Date: " .. date_str)

-- ============================================================
-- PART 1: Export all career CSVs
-- ============================================================

log("")
log("PART 1: Exporting career CSVs...")

ReloadDB()

-- Clear old CSVs
os.execute('del /Q "' .. output_dir .. '*.csv" 2>nul')

local tables = GetDBTablesNames()
log("Tables found: " .. #tables)

local exported, skipped = 0, 0

for i, table_name in ipairs(tables) do
    local ok, fields = pcall(GetDBTableFields, table_name)
    if not ok or not fields or #fields == 0 then
        skipped = skipped + 1
        goto continue_csv
    end

    local ok2, rows = pcall(GetDBTableRows, table_name)
    if not ok2 or not rows then
        skipped = skipped + 1
        goto continue_csv
    end

    local file = io.open(output_dir .. table_name .. ".csv", "w")
    if not file then
        skipped = skipped + 1
        goto continue_csv
    end

    -- Header
    local header = {}
    for _, field in ipairs(fields) do
        table.insert(header, csv_escape(field.name))
    end
    file:write(table.concat(header, ",") .. "\n")

    -- Rows
    for _, row in ipairs(rows) do
        local values = {}
        for _, field in ipairs(fields) do
            local cell = row[field.name]
            if cell and cell.value ~= nil then
                table.insert(values, csv_escape(cell.value))
            else
                table.insert(values, "")
            end
        end
        file:write(table.concat(values, ",") .. "\n")
    end

    file:close()
    exported = exported + 1

    ::continue_csv::
end

log("CSV Export: " .. exported .. " tables exported, " .. skipped .. " skipped")

-- ============================================================
-- PART 1b: Export player name via GetPlayerName API
-- ============================================================

log("")
log("PART 1b: Resolving player name via GetPlayerName API...")

local player_fullname = get_player_name(player_id)
log("Player " .. player_id .. " name: " .. player_fullname)

-- Write player_name.json so unified.py can use it when DB name is empty
local name_file = io.open(output_dir .. "player_name.json", "w")
if name_file then
    -- Try to split into first/last by finding last space
    local firstname = player_fullname
    local lastname = ""
    local space_pos = player_fullname:find(" [^ ]+$")
    if space_pos then
        firstname = player_fullname:sub(1, space_pos - 1)
        lastname = player_fullname:sub(space_pos + 1)
    end
    name_file:write(string.format(
        '{"playerid":"%s","firstname":"%s","lastname":"%s","commonname":"%s","fullname":"%s"}',
        player_id, json_escape(firstname), json_escape(lastname),
        json_escape(player_fullname), json_escape(player_fullname)
    ))
    name_file:close()
    log("Wrote player_name.json: " .. firstname .. " " .. lastname)
end

-- ============================================================
-- PART 2: Export per-competition stats for user player
-- ============================================================

log("")
log("PART 2: Exporting competition stats for player " .. player_id .. "...")

local player_stats = GetPlayerStats(player_id)
local comp_stats_json = {}

if player_stats and #player_stats > 0 then
    log("Found " .. #player_stats .. " competition(s)")
    
    for i, row in ipairs(player_stats) do
        local compobjid = row.compobjid or 0
        local competition_name = get_comp_name(compobjid)
        
        local apps = row.app or 0
        local avg_rating = 0
        if apps > 0 and row.avg then
            avg_rating = row.avg / apps / 10
        end
        
        table.insert(comp_stats_json, string.format(
            '{"compobjid":%d,"competition":"%s","teamid":%d,"apps":%d,"goals":%d,"assists":%d,"avgRating":%.2f,"yellow":%d,"red":%d,"motm":%d,"clean_sheets":%d,"goals_conceded":%d,"saves":%d}',
            compobjid, json_escape(competition_name), row.teamid or 0,
            apps, row.goals or 0, row.assists or 0, avg_rating,
            row.yellow or 0, row.red or 0, row.motm or 0,
            row.clean_sheets or 0, row.goals_conceded or 0, row.saves or 0
        ))
        
        log(string.format("  %s: %d apps, %dG %dA, %.2f avg", competition_name, apps, row.goals or 0, row.assists or 0, avg_rating))
    end
else
    log("No competition stats found")
end

-- Write competition_stats.json
local comp_file = io.open(output_dir .. "competition_stats.json", "w")
if comp_file then
    comp_file:write("[\n" .. table.concat(comp_stats_json, ",\n") .. "\n]")
    comp_file:close()
    log("Wrote competition_stats.json")
end

-- ============================================================
-- PART 3: Export league-wide stats (FILTERED)
-- ============================================================

log("")
log("PART 3: Exporting league-wide stats...")

local all_stats = GetPlayersStats()
log("Total stat records: " .. #all_stats)

-- First, find which competitions the user's team has players in
local user_competitions = {}
for i, row in ipairs(all_stats) do
    if row.teamid == user_teamid and (row.app or 0) > 0 then
        user_competitions[row.compobjid] = true
    end
end

log("User's competitions: ")
for compid, _ in pairs(user_competitions) do
    log("  - " .. get_comp_name(compid) .. " (ID: " .. compid .. ")")
end

-- Now filter to only those competitions
local competitions = {}
local player_league_stats = {}

for i, row in ipairs(all_stats) do
    local compobjid = row.compobjid or 0
    local teamid = row.teamid or 0
    local pid = row.playerid or 0
    local apps = row.app or 0
    local goals = row.goals or 0
    local assists = row.assists or 0
    local yellow = row.yellow or 0
    local red = row.red or 0
    local motm = row.motm or 0
    
    -- Only include stats from user's competitions
    if apps > 0 and user_competitions[compobjid] then
        if not competitions[compobjid] then
            local cname = get_comp_name(compobjid)
            competitions[compobjid] = {
                compobjid = compobjid,
                name = cname,
                teams = {}
            }
        end
        
        local comp = competitions[compobjid]
        
        if not comp.teams[teamid] then
            comp.teams[teamid] = {
                teamid = teamid,
                teamname = get_team_name(teamid),
                apps = 0,
                goals = 0,
                assists = 0,
                yellow = 0,
                red = 0,
                goalsAgainst = 0
            }
        end
        
        local team = comp.teams[teamid]
        team.apps = team.apps + apps
        team.goals = team.goals + goals
        team.assists = team.assists + assists
        team.yellow = team.yellow + yellow
        team.red = team.red + red
        
        -- Track player stats
        local player_key = pid .. "_" .. compobjid
        if not player_league_stats[player_key] then
            player_league_stats[player_key] = {
                playerid = pid,
                teamid = teamid,
                teamname = get_team_name(teamid),
                playerName = get_player_name(pid),
                compobjid = compobjid,
                compname = get_comp_name(compobjid),
                apps = 0,
                goals = 0,
                assists = 0,
                motm = 0
            }
        end
        
        local pstats = player_league_stats[player_key]
        pstats.apps = pstats.apps + apps
        pstats.goals = pstats.goals + goals
        pstats.assists = pstats.assists + assists
        pstats.motm = pstats.motm + motm
    end
end

-- Build competition standings JSON
local comps_json = {}
for compobjid, comp in pairs(competitions) do
    local teams_arr = {}
    
    -- Convert teams to array for sorting
    local teams_array = {}
    for teamid, team in pairs(comp.teams) do
        -- Estimate matches played (total player apps / 11 players per match)
        team.matchesPlayed = math.floor(team.apps / 11 + 0.5)
        table.insert(teams_array, team)
    end
    
    -- Sort by goals scored (descending) - this is the only reliable metric we have
    table.sort(teams_array, function(a, b) return a.goals > b.goals end)
    
    for i, team in ipairs(teams_array) do
        table.insert(teams_arr, string.format(
            '{"position":%d,"teamid":%d,"teamname":"%s","matchesPlayed":%d,"goals":%d,"assists":%d,"yellow":%d,"red":%d,"goalDifference":%d}',
            i, team.teamid, json_escape(team.teamname), team.matchesPlayed, team.goals, team.assists,
            team.yellow, team.red, team.goals - team.goalsAgainst
        ))
    end
    
    table.insert(comps_json, string.format(
        '{"compobjid":%d,"name":"%s","teams":[%s]}',
        compobjid, json_escape(comp.name), table.concat(teams_arr, ",")
    ))
end

-- Build top scorers (across user's competitions only)
local scorers = {}
for key, stats in pairs(player_league_stats) do
    if stats.goals > 0 then
        table.insert(scorers, stats)
    end
end
table.sort(scorers, function(a, b) return a.goals > b.goals end)

local scorers_json = {}
for i = 1, math.min(50, #scorers) do
    table.insert(scorers_json, string.format(
        '{"rank":%d,"playerid":%d,"teamid":%d,"teamname":"%s","playerName":"%s","compname":"%s","apps":%d,"goals":%d,"assists":%d,"motm":%d}',
        i, scorers[i].playerid, scorers[i].teamid, json_escape(scorers[i].teamname),
        json_escape(scorers[i].playerName), json_escape(scorers[i].compname),
        scorers[i].apps, scorers[i].goals, scorers[i].assists, scorers[i].motm
    ))
end

-- Build top assists
local assists_arr = {}
for key, stats in pairs(player_league_stats) do
    if stats.assists > 0 then
        table.insert(assists_arr, stats)
    end
end
table.sort(assists_arr, function(a, b) return a.assists > b.assists end)

local assists_json = {}
for i = 1, math.min(50, #assists_arr) do
    table.insert(assists_json, string.format(
        '{"rank":%d,"playerid":%d,"teamid":%d,"teamname":"%s","playerName":"%s","compname":"%s","apps":%d,"goals":%d,"assists":%d,"motm":%d}',
        i, assists_arr[i].playerid, assists_arr[i].teamid, json_escape(assists_arr[i].teamname),
        json_escape(assists_arr[i].playerName), json_escape(assists_arr[i].compname),
        assists_arr[i].apps, assists_arr[i].goals, assists_arr[i].assists, assists_arr[i].motm
    ))
end

-- Write league_stats.json
local league_json = string.format(
    '{"exportDate":"%s","userTeamId":%d,"myPlayerId":%d,"competitions":[%s],"topScorers":[%s],"topAssists":[%s]}',
    date_str, user_teamid, player_id,
    table.concat(comps_json, ","),
    table.concat(scorers_json, ","),
    table.concat(assists_json, ",")
)

local league_file = io.open(output_dir .. "league_stats.json", "w")
if league_file then
    league_file:write(league_json)
    league_file:close()
    log("Wrote league_stats.json")
    log("Competitions: " .. #comps_json)
    log("Top Scorers: " .. #scorers_json)
    log("Top Assists: " .. #assists_json)
end

-- ============================================================
-- DONE
-- ============================================================

-- Create sync flag
local flag_path = output_dir .. "\\.sync_needed"
local flag_file = io.open(flag_path, "w")
if flag_file then
    flag_file:write(os.date("%Y-%m-%d %H:%M:%S"))
    flag_file:close()
end

log("")
log("============================================================")
log("EXPORT COMPLETE!")
log("============================================================")
log("  CSVs: " .. exported .. " tables")
log("  Competition Stats: " .. #comp_stats_json .. " competitions")
log("  League Stats: " .. #comps_json .. " competitions (your leagues only)")
log("  Top Scorers: " .. #scorers_json)
log("  Top Assists: " .. #assists_json)
log("")
log("Run 'career.sh --sync' to update the frontend.")
log("============================================================")

MessageBox("Export Complete!", 
    string.format("Exported:\n• %d CSV tables\n• %d competitions (your stats)\n• %d league competitions (your leagues only)\n• %d top scorers\n• %d top assists\n\nRun 'career.sh --sync' to update frontend.", 
        exported, #comp_stats_json, #comps_json, #scorers_json, #assists_json))