import { useState, useEffect, useRef } from 'react';

const JUNE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtADRNEx9M4uGiDjqrSppUqUO-YUfDp8WcgRSLvWQUgg7zPcJMFocQ7CNa-ORol3-y4qjpb-f3GC5g/pub?gid=966793280&single=true&output=csv";

// Wraps fetch with a hard timeout -- without this, a single stalled request (bad connection,
// a Google Sheets hiccup, anything that hangs rather than errors) leaves the whole site stuck
// on the loading spinner forever, since Promise.all never resolves OR rejects in that case.
function fetchWithTimeout(url, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}
const JULY_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtADRNEx9M4uGiDjqrSppUqUO-YUfDp8WcgRSLvWQUgg7zPcJMFocQ7CNa-ORol3-y4qjpb-f3GC5g/pub?gid=356880675&single=true&output=csv";
const AUGUST_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtADRNEx9M4uGiDjqrSppUqUO-YUfDp8WcgRSLvWQUgg7zPcJMFocQ7CNa-ORol3-y4qjpb-f3GC5g/pub?gid=1316191049&single=true&output=csv";
const MAY_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtADRNEx9M4uGiDjqrSppUqUO-YUfDp8WcgRSLvWQUgg7zPcJMFocQ7CNa-ORol3-y4qjpb-f3GC5g/pub?gid=2102778375&single=true&output=csv";
const APRIL_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtADRNEx9M4uGiDjqrSppUqUO-YUfDp8WcgRSLvWQUgg7zPcJMFocQ7CNa-ORol3-y4qjpb-f3GC5g/pub?gid=172900262&single=true&output=csv";
const SUBS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSIMLdOoB3zeM0gpqCd6ejUT-eLYl1DHYjCz477dv9fF-fhTO27xXvjAtXJNvrbFpr5EFFJiIOefJYE/pub?gid=972756262&single=true&output=csv";
const SCORES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSIMLdOoB3zeM0gpqCd6ejUT-eLYl1DHYjCz477dv9fF-fhTO27xXvjAtXJNvrbFpr5EFFJiIOefJYE/pub?gid=1428642588&single=true&output=csv";
const SCORERS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSIMLdOoB3zeM0gpqCd6ejUT-eLYl1DHYjCz477dv9fF-fhTO27xXvjAtXJNvrbFpr5EFFJiIOefJYE/pub?gid=1371890124&single=true&output=csv";
// TICKER: paste the published-CSV URL of your new "Ticker" sheet tab here (same Publish-to-web format as the lines above). Leave "" to hide the ticker.
const TICKER_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSIMLdOoB3zeM0gpqCd6ejUT-eLYl1DHYjCz477dv9fF-fhTO27xXvjAtXJNvrbFpr5EFFJiIOefJYE/pub?gid=34188118&single=true&output=csv";
const SUBMIT_URL = "https://script.google.com/macros/s/AKfycbwNOAIXeCzELix1DTOBKYuZ33i2aABv0SObw3l05bBjPFBpkBEWz19XM6Cnzozh0eN19Q/exec";
// NFL Derby: paste the Apps Script Web App URL for a NEW Google Sheet tab here once set up (see chat notes).
// Expected columns: timestamp, name, email, entryNumber, qb1, qb2, k1, k2, player1..player6, swap
const NFL_SUBMIT_URL = "https://script.google.com/macros/s/AKfycbyhAit22Rp_L5z-yDunYnqLR5MocD4T7nfRWgWXy-oaUvBFJUFhpOs7RL6BSldjl4NE/exec";
// Standings need to read ALL entries at once, which is cheaper as a published CSV than
// hitting the Apps Script per viewer. Publish the same entries Sheet to the web as CSV
// (File > Share > Publish to web > this sheet > CSV) and paste that link here.
const NFL_ENTRIES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1_Fhz8leF7rFSyh-hIcCQKQl9ozfMTWZJ738fYi21bkD7SJiNfcJyYtMKJOyDkr-J2gjFPvRFG7VG/pub?gid=0&single=true&output=csv";
const NFL_SEASON_YEAR = 2026;
const DEADLINE = new Date("2026-06-11T15:00:00");
const NFL_DEADLINE = new Date("2026-09-09T20:00:00-04:00");

function parseCSV(text) {
  const rows = text.split("\n").map(r => {
    const cells = []; let cur = ""; let inQ = false;
    for (let c of r) {
      if (c === '"') inQ = !inQ;
      else if (c === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
      else cur += c;
    }
    cells.push(cur.trim());
    return cells;
  });
  const playerHR = {};
  for (const row of rows) {
    const nameCell = row[35] || "", hrCell = row[36] || "";
    if (nameCell && hrCell !== "" && nameCell !== "Player Name") playerHR[nameCell.trim()] = parseInt(hrCell) || 0;
    const ranked = row[28] || "", rankedHR = row[29] || "";
    if (ranked && rankedHR !== "" && /^\d+\./.test(ranked)) {
      const m = ranked.match(/^\d+\.\s+(.+?)\s+\([A-Z]+\)$/);
      if (m) playerHR[m[1].trim()] = parseInt(rankedHR) || 0;
    }
  }
  const monthlyStandings = [];
  for (let i = 0; i < 30; i++) {
    const r = rows[i];
    if (r && r[0] && !isNaN(parseInt(r[0])) && r[1] && r[1] !== "Overall Standings")
      monthlyStandings.push({ rank: parseInt(r[0]), name: r[1], month: parseInt(r[2]) || 0, season: parseInt(r[3]) || 0 });
  }
  const seasonStandings = [];
  let inSeason = false;
  for (const r of rows) {
    if (r[1] === "Overall Standings") { inSeason = true; continue; }
    if (inSeason && r[0] && !isNaN(parseInt(r[0])) && r[1] && r[2])
      seasonStandings.push({ rank: parseInt(r[0]), name: r[1], season: parseInt(r[2]) || 0 });
  }
  const SKIP = new Set(["2025","Total HRs","May","April","June","July","August","September","Season","Player",
    "Monthly Winners","Overall Season Winners","1st - $75","2nd - $50","1st - $300","2nd - $175","3rd - $75",
    "Overall Standings","Standings","Home Run Totals","Player Name","Rank",""]);
  const colGroups = [[6,7,8,9],[11,12,13,14],[16,17,18,19],[21,22,23,24]];
  const rosters = {}; const currentTeams = [null,null,null,null];
  for (const row of rows) {
    for (let gi = 0; gi < colGroups.length; gi++) {
      const [c0,c1,c2,c3] = colGroups[gi];
      const v0=row[c0]||"",v1=row[c1]||"",v2=row[c2]||"",v3=row[c3]||"";
      if (v0 && !SKIP.has(v0) && isNaN(parseInt(v0)) && !v1) {
        currentTeams[gi]=v0;
        if (!rosters[v0]) rosters[v0]={players:[],cap:null,month:0,season:0};
      } else if (!isNaN(parseInt(v0)) && v1 && !SKIP.has(v1)) {
        const team=currentTeams[gi];
        if (team && rosters[team]) {
          const mhr=v2!==""?parseInt(v2):null,shr=v3!==""?parseInt(v3):null;
          const out = /\(out\)\s*$/i.test(v1.trim());
          const cleanName = v1.trim().replace(/\s*\(out\)\s*$/i, "").trim();
          rosters[team].players.push({name:cleanName,cap2025:parseInt(v0),month:mhr,season:shr,swap:!out&&mhr===null&&shr===null,out});
        }
      } else if (v1==="Total HRs" && !isNaN(parseInt(v0))) {
        const team=currentTeams[gi];
        if (team&&rosters[team]){rosters[team].cap=parseInt(v0);rosters[team].month=parseInt(v2)||0;rosters[team].season=parseInt(v3)||0;}
      }
    }
  }
  const hrLeaders = [];
  for (const row of rows) {
    const cell=row[28]||"",hr=row[29]||"";
    if (cell&&hr!==""&&/^\d+\./.test(cell)){const m=cell.match(/^(\d+)\.\s+(.+?)\s+\(([A-Z]+)\)$/);if(m)hrLeaders.push({rank:parseInt(m[1]),name:m[2].trim(),team:m[3],hr:parseInt(hr)||0});}
  }
  return { monthlyStandings, seasonStandings, rosters: Object.entries(rosters).map(([teamName,d])=>({teamName,...d})), hrLeaders };
}

function parseSubmissions(text) {
  const rows = text.split("\n").map(r => {
    const cells = []; let cur = ""; let inQ = false;
    for (let c of r) {
      if (c === '"') inQ = !inQ;
      else if (c === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
      else cur += c;
    }
    cells.push(cur.trim());
    return cells;
  });
  const subs = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[1]) continue;
    const entry = { timestamp: r[0], name: r[1], email: r[2] };
    for (let g = 1; g <= 12; g++) entry["group" + g] = r[g + 2] || "";
    entry.goldenBoot = r[15] || "";
    entry.entryNumber = r[17] || 1;
    subs.push(entry);
  }
  return subs;
}

// Hashes a PIN with SHA-256 so the real PIN is never stored or transmitted --
// only this one-way scrambled version, which can confirm a match but can't be
// reversed back into the original PIN.
async function hashPin(pin) {
  if (!pin) return "";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function parseNflEntriesCSV(text) {
  const lines = text.split("\n").filter(l => l.trim() !== "");
  if (lines.length < 2) return [];
  const splitRow = (r) => {
    const cells = []; let cur = ""; let inQ = false;
    for (let c of r) {
      if (c === '"') inQ = !inQ;
      else if (c === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
      else cur += c;
    }
    cells.push(cur.trim());
    return cells;
  };
  const headers = splitRow(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = splitRow(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] || "").trim(); });
    return obj;
  }).filter(e => e.email);
}

function parseScores(text) {
  const rows = text.split("\n").slice(1);
  const stats = {};
  rows.forEach(row => {
    const cells = row.split(",");
    const team = cells[0]?.trim();
    if (!team) return;
    const elim = (cells[5] || "").trim().toLowerCase();
    stats[team] = {
      goals: parseInt(cells[1]) || 0,
      wins: parseInt(cells[2]) || 0,
      draws: parseInt(cells[3]) || 0,
      bonus: parseInt(cells[4]) || 0,
      eliminated: elim === "x" || elim === "out" || elim === "yes" || elim === "true" || elim === "1",
      played: parseInt(cells[6]) || 0,
    };
  });
  return stats;
}

function parseScorers(text) {
  const rows = text.split("\n").slice(1);
  const scorers = [];
  rows.forEach(row => {
    const cells = row.split(",");
    const player = cells[0]?.trim();
    const goals = parseInt(cells[1]) || 0;
    const team = cells[2]?.trim() || "";
    if (!player) return;
    scorers.push({player, goals, team});
  });
  return scorers.sort((a,b) => b.goals - a.goals);
}

function parseTicker(text) {
  const out = [];
  text.split("\n").forEach((r, idx) => {
    if (idx === 0) return; // skip header row
    const cells = []; let cur = ""; let inQ = false;
    for (let c of r) {
      if (c === '"') inQ = !inQ;
      else if (c === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
      else cur += c;
    }
    cells.push(cur.trim());
    const msg = (cells[0] || "").trim();
    if (!msg) return;
    out.push({ msg, label: (cells[1] || "").trim() });
  });
  return out;
}

function calcScore(entry, teamStats) {
  let total = 0;
  const breakdown = {};
  for (let g = 1; g <= 12; g++) {
    const team = entry["group" + g] || "";
    const mult = g >= 10 ? 3 : g >= 6 ? 2 : 1;
    const stats = teamStats[team] || {goals:0,wins:0,draws:0,bonus:0};
    const pts = (stats.goals||0)*1 + (stats.wins||0)*3 + (stats.draws||0)*1 + (stats.bonus||0);
    const scored = pts * mult;
    breakdown["group" + g] = {team, pts, mult, scored};
    total += scored;
  }
  return {total, breakdown};
}

const WC_GROUPS = [
  {group:1,multiplier:1,teams:["France","Spain","England","Brazil"]},
  {group:2,multiplier:1,teams:["Argentina","Portugal","Germany","Netherlands"]},
  {group:3,multiplier:1,teams:["Norway","Belgium","Colombia","Morocco"]},
  {group:4,multiplier:1,teams:["Japan","United States","Uruguay","Mexico"]},
  {group:5,multiplier:1,teams:["Switzerland","Croatia","Ecuador","Turkey"]},
  {group:6,multiplier:2,teams:["Sweden","Senegal","Paraguay","Austria"]},
  {group:7,multiplier:2,teams:["Scotland","Canada","Ivory Coast","Czech Republic"]},
  {group:8,multiplier:2,teams:["Bosnia","Ghana","Egypt","Algeria"]},
  {group:9,multiplier:2,teams:["South Korea","Tunisia","Australia","Iran"]},
  {group:10,multiplier:3,teams:["DR Congo","South Africa","Uzbekistan","Panama"]},
  {group:11,multiplier:3,teams:["Qatar","Iraq","Saudi Arabia","Cape Verde"]},
  {group:12,multiplier:3,teams:["New Zealand","Curacao","Jordan","Haiti"]},
];

const WC_SCORING = [
  {event:"Each goal scored",pts:1},{event:"Group play win",pts:3},{event:"Group play draw",pts:1},
  {event:"Win group (1st place)",pts:8},{event:"Finish 2nd in group",pts:4},
  {event:"Advance as best 3rd-place",pts:2},{event:"Win Round of 32 (reach R16)",pts:8},
  {event:"Reach Quarterfinals",pts:12},{event:"Reach Semifinals",pts:24},
  {event:"Reach Final",pts:36},{event:"Win Final (Champion)",pts:48},
];

const GOLDEN_BOOT_PLAYERS = [
  "Kylian Mbappé","Harry Kane","Lionel Messi","Erling Haaland","Lamine Yamal",
  "Michael Olise","Cole Palmer","Mikel Oyarzabal","Cristiano Ronaldo","Vinicius Junior",
  "Lautaro Martinez","Ousmane Dembele","Romelu Lukaku","Raphinha","Nick Woltemade",
  "Julian Alvarez","Alvaro Morata","Richarlison","Joao Pedro","Cody Gakpo",
  "Bukayo Saka","Memphis Depay","Ferran Torres","Mikel Merino","Igor Thiago",
  "Jean-Philippe Mateta","Jude Bellingham","Goncalo Ramos","Florian Wirtz","Marcus Thuram",
  "Neymar","Bruno Fernandes","Luis Diaz","Desire Doue","Mohamed Salah",
  "Kai Havertz","Dani Olmo","Deniz Undav","Viktor Gyokeres","Enner Valencia",
  "Donyell Malen","Morgan Rogers","Santiago Gimenez","Darwin Nunez","Eberechi Eze",
  "Lois Openda","Jamal Musiala","Leandro Trossard","Marcus Rashford","Matheus Cunha",
  "Alexander Sorloth","Alexander Isak","Folarin Balogun","Kevin De Bruyne","Christian Pulisic",
  "Anthony Gordon","Rafael Leao","Jeremy Doku","Sadio Mane","Leroy Sane",
  "Jhon Duran","Raul Jimenez","Ante Budimir","Brian Brobbey","Christoph Baumgartner",
  "Ollie Watkins","Omar Marmoush","Arda Guler","Mohammed Kudus","Nicolas Jackson",
  "Jonathan David","Kenan Yildiz","Pedro Neto","Haji Wright","Nico Williams",
  "Ricardo Pepi","Scott McTominay","Bradley Barcola","Casemiro","Charles De Ketelaere",
  "Gabriel Martinelli","Rayan Cherki","Breel Embolo","Ismaila Sarr","Hamza Igamane",
  "Noa Lang","Hirving Lozano","Lee Kang-In","Enzo Fernandez","Jorgen Strand Larsen",
  "Riyad Mahrez","James Rodriguez","Brahim Diaz","Andrej Kramaric","Jhon Arias",
  "Ange-Yoan Bonny","Ivan Toney","Julian Quinones","Pedri","Che Adams",
  "Chris Wood","Oscar Bobb","Cyle Larin","Martin Odegaard","Daizen Maeda",
  "Amad Diallo","Denzel Dumfries","Ermedin Demirovic","Lawrence Shankland","Lucas Paqueta",
  "Nicolas Pepe","Noah Okafor","Zeki Amdouni","Giovanni Reyna","Julio Enciso",
  "Achraf Hakimi","Anthony Elanga","Cedric Bakambu","Dan Ndoye","Marcel Sabitzer",
  "Yoane Wissa","Brenden Aaronson","Lyle Foster","John McGinn",
];

// ── NFL DERBY REFERENCE DATA (2026 season, salaries from 2025 stats) ──────────
const NFL_QB_TEAMS = [
  {team:"LA Rams",tds:46},{team:"Buffalo Bills",tds:43},{team:"Cincinnati Bengals",tds:38},
  {team:"Jacksonville Jaguars",tds:38},{team:"San Francisco 49ers",tds:36},{team:"New England Patriots",tds:35},
  {team:"Detroit Lions",tds:34},{team:"Philadelphia Eagles",tds:34},{team:"Dallas Cowboys",tds:33},
  {team:"Indianapolis Colts",tds:32},{team:"Arizona Cardinals",tds:31},{team:"Chicago Bears",tds:30},
  {team:"Denver Broncos",tds:30},{team:"NY Giants",tds:30},{team:"Green Bay Packers",tds:28},
  {team:"Kansas City Chiefs",tds:28},{team:"LA Chargers",tds:28},{team:"Tampa Bay Buccaneers",tds:27},
  {team:"Pittsburgh Steelers",tds:27},{team:"Carolina Panthers",tds:26},{team:"Houston Texans",tds:26},
  {team:"Baltimore Ravens",tds:25},{team:"Seattle Seahawks",tds:25},{team:"Washington Commanders",tds:23},
  {team:"Miami Dolphins",tds:23},{team:"Minnesota Vikings",tds:21},{team:"New Orleans Saints",tds:21},
  {team:"Atlanta Falcons",tds:21},{team:"Las Vegas Raiders",tds:20},{team:"NY Jets",tds:19},
  {team:"Tennessee Titans",tds:17},{team:"Cleveland Browns",tds:17},
];

const NFL_KICKER_TEAMS = [
  {team:"Atlanta Falcons",pts:25},{team:"Dallas Cowboys",pts:25},{team:"Houston Texans",pts:25},
  {team:"Indianapolis Colts",pts:25},{team:"Kansas City Chiefs",pts:25},{team:"LA Chargers",pts:25},
  {team:"Minnesota Vikings",pts:25},{team:"San Francisco 49ers",pts:25},{team:"Tampa Bay Buccaneers",pts:25},
  {team:"Baltimore Ravens",pts:25},{team:"Chicago Bears",pts:25},{team:"Jacksonville Jaguars",pts:25},
  {team:"New Orleans Saints",pts:25},{team:"NY Jets",pts:25},{team:"Seattle Seahawks",pts:25},
  {team:"Tennessee Titans",pts:25},{team:"Arizona Cardinals",pts:20},{team:"Denver Broncos",pts:20},
  {team:"Green Bay Packers",pts:20},{team:"Las Vegas Raiders",pts:20},{team:"Miami Dolphins",pts:20},
  {team:"Pittsburgh Steelers",pts:20},{team:"Washington Commanders",pts:20},{team:"Buffalo Bills",pts:20},
  {team:"Carolina Panthers",pts:20},{team:"Cincinnati Bengals",pts:20},{team:"Cleveland Browns",pts:20},
  {team:"Detroit Lions",pts:20},{team:"LA Rams",pts:20},{team:"New England Patriots",pts:20},
  {team:"NY Giants",pts:20},{team:"Philadelphia Eagles",pts:20},
];

const NFL_PLAYER_POOL = [
  {name:"Jonathan Taylor",team:"IND",tds:20},{name:"Jahmyr Gibbs",team:"DET",tds:18},{name:"Christian McCaffrey",team:"SF",tds:17},
  {name:"Derrick Henry",team:"BAL",tds:16},{name:"Davante Adams",team:"LAR",tds:14},{name:"James Cook",team:"BUF",tds:14},
  {name:"Josh Jacobs",team:"GB",tds:14},{name:"Travis Etienne",team:"NO",tds:13},{name:"Javonte Williams",team:"DAL",tds:13},
  {name:"Kyren Williams",team:"LAR",tds:13},{name:"Zach Charbonnet",team:"SEA",tds:12},{name:"De'Von Achane",team:"MIA",tds:12},
  {name:"RJ Harvey",team:"DEN",tds:12},{name:"Chase Brown",team:"CIN",tds:11},{name:"Tee Higgins",team:"CIN",tds:11},
  {name:"Bijan Robinson",team:"ATL",tds:11},{name:"Dallas Goedert",team:"PHI",tds:11},{name:"Trey McBride",team:"ARI",tds:11},
  {name:"Puka Nacua",team:"LAR",tds:11},{name:"Amon-Ra St. Brown",team:"DET",tds:11},{name:"TreVeyon Henderson",team:"NE",tds:10},
  {name:"Ashton Jeanty",team:"LV",tds:10},{name:"Jaxon Smith-Njigba",team:"SEA",tds:10},{name:"D'Andre Swift",team:"CHI",tds:10},
  {name:"Jauan Jennings",team:"MIN",tds:9},{name:"George Pickens",team:"DAL",tds:9},{name:"Kareem Hunt",team:"KC",tds:9},
  {name:"Chris Olave",team:"NO",tds:9},{name:"Rhamondre Stevenson",team:"NE",tds:9},{name:"Saquon Barkley",team:"PHI",tds:9},
  {name:"Jake Ferguson",team:"DAL",tds:8},{name:"David Montgomery",team:"HOU",tds:8},{name:"Tyler Allgeier",team:"ARI",tds:8},
  {name:"Ja'Marr Chase",team:"CIN",tds:8},{name:"Jacory Croskey-Merritt",team:"WAS",tds:8},{name:"Kenneth Gainwell",team:"TB",tds:8},
  {name:"Quentin Johnston",team:"LAC",tds:8},{name:"Colby Parkinson",team:"LAR",tds:8},{name:"Sean Tucker",team:"TB",tds:8},
  {name:"Jaylen Warren",team:"PIT",tds:8},{name:"Brock Bowers",team:"LV",tds:7},{name:"Nico Collins",team:"HOU",tds:7},
  {name:"Quinshon Judkins",team:"CLE",tds:7},{name:"Drake London",team:"ATL",tds:7},{name:"Michael Pittman Jr.",team:"PIT",tds:7},
  {name:"Cam Skattebo",team:"NYG",tds:7},{name:"Courtland Sutton",team:"DEN",tds:7},{name:"AJ Barner",team:"SEA",tds:7},
  {name:"AJ Brown",team:"NE",tds:7},{name:"Rico Dowdle",team:"PIT",tds:7},{name:"Harold Fannin",team:"CLE",tds:7},
  {name:"Hunter Henry",team:"NE",tds:7},{name:"George Kittle",team:"SF",tds:7},{name:"Tetairoa McMillan",team:"CAR",tds:7},
  {name:"DK Metcalf",team:"PIT",tds:7},{name:"DJ Moore",team:"BUF",tds:7},{name:"Bhayshul Tuten",team:"JAX",tds:7},
  {name:"Jameson Williams",team:"DET",tds:7},{name:"Michael Wilson",team:"ARI",tds:7},{name:"Romeo Doubs",team:"NE",tds:6},
  {name:"Emeka Egbuka",team:"TB",tds:6},{name:"Rashee Rice",team:"KC",tds:6},{name:"Mark Andrews",team:"BAL",tds:6},
  {name:"Kayshon Boutte",team:"HOU",tds:6},{name:"Blake Corum",team:"LAR",tds:6},{name:"Zay Flowers",team:"BAL",tds:6},
  {name:"Jayden Higgins",team:"HOU",tds:6},{name:"Tucker Kraft",team:"GB",tds:6},{name:"Colston Loveland",team:"CHI",tds:6},
  {name:"Jordan Mason",team:"MIN",tds:6},{name:"Ladd McConkey",team:"LAC",tds:6},{name:"Rome Odunze",team:"CHI",tds:6},
  {name:"Alec Pierce",team:"IND",tds:6},{name:"Chris Rodriguez",team:"JAX",tds:6},{name:"Deebo Samuel",team:"SF",tds:6},
  {name:"Isaac TeSlaa",team:"DET",tds:6},{name:"Jaylen Waddle",team:"DEN",tds:6},{name:"Darren Waller",team:"MIA",tds:6},
  {name:"Christian Watson",team:"GB",tds:6},{name:"Troy Franklin",team:"DEN",tds:6},{name:"Woody Marks",team:"HOU",tds:5},
  {name:"Parker Washington",team:"JAX",tds:5},{name:"Tory Horton",team:"SEA",tds:5},{name:"Kyle Monangai",team:"CHI",tds:5},
  {name:"Travis Kelce",team:"KC",tds:5},{name:"Marquise Brown",team:"PHI",tds:5},{name:"Breece Hall",team:"NYJ",tds:5},
  {name:"Omarion Hampton",team:"LAC",tds:5},{name:"Tez Johnson",team:"TB",tds:5},{name:"Theo Johnson",team:"NYG",tds:5},
  {name:"Ty Johnson",team:"BUF",tds:5},{name:"Dalton Kincaid",team:"BUF",tds:5},{name:"Zonovan Knight",team:"ARI",tds:5},
  {name:"Kyle Pitts",team:"ATL",tds:5},{name:"Tony Pollard",team:"TEN",tds:5},{name:"Devin Singletary",team:"NYG",tds:5},
  {name:"Jake Tonges",team:"SF",tds:5},{name:"Tre Tucker",team:"LV",tds:5},{name:"Kenneth Walker III",team:"KC",tds:5},
  {name:"Tyler Warren",team:"IND",tds:5},
];

// ── NFL DERBY SCORING HELPERS (inline -- this app is single-file, no local imports) ──
const NFL_PERIODS = {
  "Period 1": [1,2,3,4],
  "Period 2": [5,6,7,8],
  "Period 3": [9,10,11,12,13],
  "Period 4": [14,15,16,17,18],
};

function weeksThroughPeriod(periodName) {
  const order = ["Period 1","Period 2","Period 3","Period 4"];
  const idx = order.indexOf(periodName);
  if (idx === -1) return [];
  return order.slice(0, idx+1).flatMap(p => NFL_PERIODS[p]);
}

async function fetchWeeksStats(weeks, year) {
  const results = await Promise.all(
    weeks.map(w => fetch(`/api/nfl-week?week=${w}&year=${year}`).then(r => r.json()))
  );
  const teams = {}, players = {};
  const bump = (obj, key, field, amount) => {
    if (!amount) return;
    if (!obj[key]) obj[key] = {};
    obj[key][field] = (obj[key][field] || 0) + amount;
  };
  for (const wk of results) {
    for (const [team, s] of Object.entries(wk.teams || {})) {
      bump(teams, team, "passingTD", s.passingTD || 0);
      bump(teams, team, "fgMade", s.fgMade || 0);
    }
    for (const [name, s] of Object.entries(wk.players || {})) {
      bump(players, name, "rushTD", s.rushTD || 0);
      bump(players, name, "recTD", s.recTD || 0);
    }
  }
  for (const name of Object.keys(players)) {
    players[name].totalTD = (players[name].rushTD||0) + (players[name].recTD||0);
  }
  return {teams, players};
}

function fetchPeriodStats(periodName, year) {
  const weeks = periodName === "Overall" ? weeksThroughPeriod("Period 4") : NFL_PERIODS[periodName];
  return fetchWeeksStats(weeks, year);
}

function scoreRoster(roster, stats) {
  let total = 0;
  const breakdown = [];
  for (const teamName of roster.qb || []) {
    const pts = (stats.teams[teamName]?.passingTD || 0) * 6;
    total += pts; breakdown.push({slot:"QB", name:teamName, pts});
  }
  for (const teamName of roster.k || []) {
    const pts = (stats.teams[teamName]?.fgMade || 0) * 3;
    total += pts; breakdown.push({slot:"K", name:teamName, pts});
  }
  for (const playerName of roster.skill || []) {
    const pts = (stats.players[playerName]?.totalTD || 0) * 6;
    total += pts; breakdown.push({slot:"Skill", name:playerName, pts});
  }
  return {total, breakdown};
}

const S = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#000000;--sur:#0a1a1a;--sur2:#0f2424;--bdr:#1a3a3a;--gold:#00c4b4;--gold2:#00a89a;--red:#e84545;--grn:#00e5d4;--blu:#00c4b4;--txt:#ffffff;--mut:#5fa89e;--F:'Bebas Neue',sans-serif;--B:'DM Sans',sans-serif}
body{background:#000;color:#fff;font-family:var(--B);min-height:100vh}
.hdr{background:#000;border-bottom:2px solid #fff;padding:0 24px;position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;height:64px}
.logo{font-family:var(--F);font-size:28px;letter-spacing:2px;color:#00c4b4;cursor:pointer}.logo span{color:#fff}
.nav{display:flex;gap:4px;padding:16px 24px 0;border-bottom:2px solid #fff;background:#000;overflow-x:auto}
.ntab{padding:10px 20px 12px;border:none;background:transparent;color:#5fa89e;font-family:var(--F);font-size:18px;letter-spacing:1px;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .2s;white-space:nowrap}
.ntab:hover{color:#fff}.ntab.on{color:#00c4b4;border-bottom-color:#fff}
@media(max-width:640px){
.nav{padding:12px 8px 0;gap:0;overflow-x:hidden}
.ntab{flex:1 1 0;padding:8px 2px 10px;font-size:15px;letter-spacing:.5px;text-align:center}
}
.dgrid-label{font-family:var(--F);font-size:22px;letter-spacing:3px;color:#5fa89e;margin:4px 0 14px}
.main{padding:24px;max-width:1200px;margin:0 auto}
.phdr{background:#000;border:2px solid #fff;border-left:5px solid #00c4b4;border-radius:8px;padding:20px 24px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.ptitle{font-family:var(--F);font-size:32px;letter-spacing:2px;color:#00c4b4}
.pmeta{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.pill{background:#000;border:1px solid #fff;border-radius:20px;padding:4px 14px;font-size:13px;color:#5fa89e}.pill strong{color:#fff}
.stabs{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
.stab{padding:8px 18px;border:1px solid #fff;border-radius:4px;background:#000;color:#5fa89e;font-size:14px;font-weight:500;cursor:pointer;transition:all .15s}
.stab:hover{border-color:#00c4b4;color:#fff}.stab.on{background:#00c4b4;color:#000;border-color:#fff;font-weight:600}
.card{background:#000;border:2px solid #fff;border-radius:8px;overflow:hidden;margin-bottom:20px}
.chdr{padding:14px 20px;border-bottom:2px solid #fff;font-family:var(--F);font-size:20px;letter-spacing:1px;color:#00c4b4;display:flex;align-items:center;gap:10px}
table{width:100%;border-collapse:collapse}
th{background:#0a1a1a;padding:10px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#fff;border-bottom:2px solid #fff}
td{padding:10px 16px;border-bottom:1px solid #111;font-size:14px}
tr:last-child td{border-bottom:none}tr:hover td{background:rgba(0,196,180,.06)}
th.r,td.r{text-align:right}
.rbadge{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;font-size:12px;font-weight:700;background:#0f2424;color:#5fa89e;border:1px solid #1a3a3a}
.r1{background:#00c4b4;color:#000;border-color:#fff}.r2{background:#b0b8cc;color:#000;border-color:#fff}.r3{background:#cd7f32;color:#fff;border-color:#fff}
.ttag{display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;background:#0f2424;color:#00c4b4;border:1px solid #1a3a3a}
.hn{font-family:var(--F);font-size:20px;color:#00c4b4}
.hns{font-family:var(--F);font-size:16px;color:#fff}
.srch{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
input.si{flex:1;min-width:200px;background:#000;border:1px solid #fff;border-radius:6px;padding:9px 14px;color:#fff;font-family:var(--B);font-size:14px;outline:none}
input.si:focus{border-color:#00c4b4}input.si::placeholder{color:#5fa89e}
.m1x{color:#5fa89e;font-size:12px;font-weight:600}
.m2x{color:#00c4b4;font-size:12px;font-weight:700;background:rgba(0,196,180,.1);padding:2px 7px;border-radius:3px;border:1px solid #00c4b4}
.m3x{color:#fff;font-size:12px;font-weight:700;background:rgba(255,255,255,.1);padding:2px 7px;border-radius:3px;border:1px solid #fff}
.ggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.gcard{background:#000;border:2px solid #fff;border-radius:8px;overflow:hidden}
.gchdr{padding:10px 16px;display:flex;align-items:center;justify-content:space-between;background:#0a1a1a;border-bottom:2px solid #fff}
.gname{font-family:var(--F);font-size:18px;letter-spacing:1px;color:#00c4b4}
.grow{padding:8px 16px;font-size:14px;border-bottom:1px solid #111;color:#fff}.grow:last-child{border-bottom:none}
.elim{text-decoration:line-through;text-decoration-color:#e84545;text-decoration-thickness:2px;color:#5fa89e}
.grow.elim{color:#5fa89e}
.outtag{display:inline-block;margin-left:8px;padding:1px 7px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:1px;background:rgba(232,69,69,.12);color:#e84545;border:1px solid #e84545;vertical-align:middle;text-decoration:none}
.gown{flex-shrink:0;font-size:12px;font-weight:600;color:#00c4b4}
.srow{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid #111}.srow:last-child{border-bottom:none}
.spts{font-family:var(--F);font-size:22px;color:#00c4b4}
.sgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:640px){.sgrid{grid-template-columns:1fr}}
.rbox{background:#000;border:1px solid #fff;border-radius:6px;padding:20px}
.ri{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #111;font-size:14px;line-height:1.6;color:#ddd}.ri:last-child{border-bottom:none}
.rn{color:#00c4b4;font-family:var(--F);font-size:18px;min-width:24px}
.dgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-bottom:28px}
.dc{background:#000;border:2px solid #fff;border-radius:10px;overflow:hidden;cursor:pointer;transition:border-color .15s}
.dc:hover{border-color:#00c4b4}
.dctop{padding:20px;border-bottom:2px solid #fff;display:flex;align-items:center;gap:16px}
.dico{width:52px;height:52px;border-radius:10px;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:26px}
.dctitle{font-family:var(--F);font-size:22px;letter-spacing:1px}.dcsub{font-size:13px;color:#5fa89e;margin-top:2px}
.dcbody{padding:16px 20px}
.dsr{display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px}
.dsl{color:#5fa89e}.dsv{font-weight:600;color:#fff}
.dcta{display:block;text-align:center;padding:10px;background:#00c4b4;color:#000;font-weight:700;border:none;cursor:pointer;width:100%;font-family:var(--F);font-size:16px;letter-spacing:1px;border-top:2px solid #fff}
.dcta:hover{background:#00a89a}
.dbadge{display:inline-flex;align-items:center;gap:6px;background:rgba(232,69,69,.12);border:1px solid #e84545;color:#e84545;border-radius:4px;padding:4px 10px;font-size:12px;font-weight:600}
.blive{background:rgba(0,229,212,.15);color:#00e5d4;border:1px solid #00e5d4;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;letter-spacing:1px}
.bsoon{background:rgba(0,196,180,.15);color:#00c4b4;border:1px solid #fff;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700}
.bcome{background:rgba(255,215,0,.12);color:#ffd700;border:1px solid #ffd700;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;letter-spacing:1px}
.dc-coming{position:relative}
.dc-coming .dcbody,.dc-coming .dctop{opacity:.55}
.dc-ribbon{position:absolute;top:18px;right:-42px;transform:rotate(38deg);background:#ffd700;color:#000;font-family:var(--F);font-size:15px;letter-spacing:2px;font-weight:700;padding:4px 48px;z-index:2;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.5)}
.dcta-coming{background:#1a1a1a;color:#ffd700;border-top:2px solid #ffd700}
.dcta-coming:hover{background:#262626}
.nfl-hero{background:#000;border:2px solid #ffd700;border-radius:10px;padding:48px 24px;text-align:center;margin-bottom:24px}
.nfl-hero-title{font-family:var(--F);font-size:44px;letter-spacing:4px;color:#ffd700;margin-bottom:8px}
.nfl-hero-sub{color:#5fa89e;font-size:15px;max-width:520px;margin:0 auto;line-height:1.6}
.swapb{font-size:10px;background:rgba(0,196,180,.15);color:#00c4b4;border:1px solid #00c4b4;border-radius:3px;padding:1px 5px;margin-left:6px;font-weight:700}
.outb{font-size:10px;background:rgba(232,69,69,.15);color:#e84545;border:1px solid #e84545;border-radius:3px;padding:1px 5px;margin-left:6px;font-weight:700}
.lbar{height:4px;background:#111;border-radius:2px;margin-top:4px;overflow:hidden}
.lfill{height:100%;border-radius:2px;background:#00c4b4}
.rgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.rc{background:#000;border:2px solid #fff;border-radius:8px;overflow:hidden}
.rchdr{padding:12px 16px;background:#0a1a1a;border-bottom:2px solid #fff;display:flex;align-items:center;justify-content:space-between}
.rcname{font-family:var(--F);font-size:16px;letter-spacing:1px;color:#fff}
.rctots{display:flex;gap:12px}
.rcstat .v{font-family:var(--F);font-size:18px;color:#00c4b4}
.rcstat .lbl{font-size:10px;color:#5fa89e;letter-spacing:1px;text-transform:uppercase}
.rpr{padding:8px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #111;font-size:13px}.rpr:last-child{border-bottom:none}
.tabs2{display:flex;background:#000;border:2px solid #fff;border-radius:6px;overflow:hidden;margin-bottom:16px;width:fit-content;flex-wrap:wrap}
.t2{padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:transparent;color:#5fa89e;letter-spacing:.5px}
.t2.on{background:#00c4b4;color:#000}
.podium{display:flex;gap:12px;margin-bottom:20px}
.pod{flex:1;background:#000;border:2px solid #fff;border-radius:8px;padding:16px;text-align:center}
.pod.p1{border-color:#00c4b4}.pod.p2{border-color:#b0b8cc}.pod.p3{border-color:#cd7f32}
.pos{font-family:var(--F);font-size:32px}
.p1 .pos{color:#00c4b4}.p2 .pos{color:#b0b8cc}.p3 .pos{color:#cd7f32}
.pteam{font-weight:600;font-size:14px;margin:4px 0 2px;color:#fff}.phr{font-family:var(--F);font-size:24px;color:#fff}.plbl{font-size:11px;color:#5fa89e;letter-spacing:1px}
@media(max-width:500px){.podium{flex-direction:column}}
.loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;gap:16px;color:#5fa89e}
.spinner{width:48px;height:48px;border:4px solid #1a3a3a;border-top-color:#00c4b4;border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#00c4b4;margin-right:6px;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.updated{font-size:12px;color:#5fa89e;display:flex;align-items:center}
.month-badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:1px;margin-left:8px}
.month-current{background:rgba(0,229,212,.15);color:#00e5d4;border:1px solid #00e5d4}
.month-past{background:#0a1a1a;color:#5fa89e;border:1px solid #1a3a3a}
.form-section{background:#000;border:2px solid #fff;border-radius:8px;margin-bottom:20px;overflow:hidden}
.form-section-hdr{padding:14px 20px;background:#0a1a1a;border-bottom:2px solid #fff;font-family:var(--F);font-size:18px;letter-spacing:1px;display:flex;align-items:center;justify-content:space-between;color:#fff}
.form-section-hdr .num{color:#00c4b4}
.form-group{padding:16px 20px;border-bottom:1px solid #111}.form-group:last-child{border-bottom:none}
.form-label{font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#5fa89e;margin-bottom:8px;display:block}
.form-input{width:100%;background:#000;border:1px solid #fff;border-radius:6px;padding:10px 14px;color:#fff;font-family:var(--B);font-size:14px;outline:none}
.form-input:focus{border-color:#00c4b4}.form-input::placeholder{color:#5fa89e}
.team-select-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;padding:4px 0}
.team-btn{padding:9px 12px;border:1px solid #333;border-radius:6px;background:#000;color:#fff;font-family:var(--B);font-size:13px;cursor:pointer;text-align:left}
.team-btn:hover{border-color:#00c4b4;color:#00c4b4}
.team-btn.sel{border-color:#00c4b4;background:rgba(0,196,180,.12);color:#00c4b4;font-weight:600}
.progress-bar-wrap{margin-bottom:20px}
.progress-bar{height:6px;background:#111;border-radius:3px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,#00c4b4,#00e5d4);border-radius:3px;transition:width .3s}
.progress-label{display:flex;justify-content:space-between;font-size:12px;color:#5fa89e;margin-bottom:6px}
.submit-btn{width:100%;padding:16px;background:#00c4b4;color:#000;border:2px solid #fff;border-radius:8px;font-family:var(--F);font-size:24px;letter-spacing:2px;cursor:pointer;margin-top:8px}
.submit-btn:disabled{opacity:.5;cursor:not-allowed}
.success-screen{text-align:center;padding:60px 24px;max-width:600px;margin:0 auto}
.success-icon{font-size:72px;margin-bottom:20px}
.success-title{font-family:var(--F);font-size:48px;letter-spacing:3px;color:#00c4b4;margin-bottom:12px}
.success-sub{color:#5fa89e;font-size:16px;line-height:1.6;margin-bottom:32px}
.picks-summary{background:#000;border:2px solid #fff;border-radius:8px;padding:20px;text-align:left;margin-bottom:24px}
.picks-summary-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #111;font-size:14px}.picks-summary-row:last-child{border-bottom:none}
.picks-summary-label{color:#5fa89e}.picks-summary-value{font-weight:600;color:#fff}
.gb-select{width:100%;background:#000;border:1px solid #fff;border-radius:6px;padding:10px 14px;color:#fff;font-family:var(--B);font-size:14px;outline:none;cursor:pointer}
.gb-select:focus{border-color:#00c4b4}
.error-msg{background:rgba(232,69,69,.1);border:1px solid #e84545;color:#e84545;border-radius:6px;padding:12px 16px;font-size:14px;margin-bottom:16px}
.entry-card{background:#000;border:2px solid #fff;border-radius:8px;overflow:hidden}
.ec-hdr{padding:12px 16px;background:#0a1a1a;border-bottom:2px solid #fff;display:flex;align-items:center;justify-content:space-between}
.ec-name{font-family:var(--F);font-size:16px;letter-spacing:1px;color:#fff}
.breakdown-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;padding:12px}
.mplayed{display:flex;align-items:center;justify-content:space-between;margin:0 12px 4px;padding:8px 14px;background:rgba(0,196,180,.06);border:1px solid #1a3a3a;border-radius:6px}
.oddsbanner{background:#0a1a1a;border:2px solid #fff;border-left:5px solid #00c4b4;border-radius:8px;padding:14px 18px;margin-bottom:16px;font-size:13px;color:#5fa89e;line-height:1.7}
.oddsrow{display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px solid #111}.oddsrow:last-child{border-bottom:none}
.oddsname{font-weight:600;font-size:15px;color:#fff}
.oddsentry{font-size:11px;color:#5fa89e;margin-left:8px;font-weight:400}
.oddsmeta{font-size:12px;color:#5fa89e;margin:3px 0 7px}
.oddsbar{height:7px;background:#0f2424;border:1px solid #1a3a3a;border-radius:4px;overflow:hidden}
.oddsfill{height:100%;background:linear-gradient(90deg,#00a89a,#00e5d4);border-radius:4px;transition:width .3s}
.oddspct{font-family:var(--F);font-size:26px;color:#00c4b4;letter-spacing:1px;min-width:64px;text-align:right}
.ticker{display:flex;align-items:stretch;background:#0a1414;border:1px solid #1a3a3a;border-radius:8px;overflow:hidden;margin-bottom:16px}
.ticker-tag{flex-shrink:0;display:flex;align-items:center;padding:0 16px;background:#00c4b4;color:#001a18;font-family:var(--F);letter-spacing:2px;font-size:14px}
.ticker-view{overflow:hidden;flex:1;display:flex;align-items:center}
.ticker-track{display:inline-flex;align-items:center;white-space:nowrap;animation:tickerscroll 38s linear infinite}
.ticker:hover .ticker-track{animation-play-state:paused}
.ticker-item{display:inline-flex;align-items:center;color:#cfeae7;font-size:14px;padding:11px 0}
.ticker-chip{background:rgba(0,196,180,.15);color:#00c4b4;border:1px solid #00c4b4;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:1px;padding:1px 7px;margin-right:9px;text-transform:uppercase}
.ticker-sep{color:#2a5a56;margin:0 24px}
.july4-banner{background:linear-gradient(90deg,#b22234 0%,#b22234 33%,#ffffff 33%,#ffffff 66%,#3c3b6e 66%,#3c3b6e 100%);padding:2px;border-radius:8px;margin-bottom:16px}
.july4-inner{background:#000;border-radius:6px;padding:12px 20px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;text-align:center}
.july4-title{font-family:var(--F);font-size:24px;letter-spacing:2px;background:linear-gradient(90deg,#e84545,#ffffff,#3b6cff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:#fff}
.july4-sub{font-size:13px;color:#5fa89e}
.july4-star{font-size:20px;animation:twinkle 1.5s infinite alternate}
@keyframes twinkle{from{opacity:.4;transform:scale(.9)}to{opacity:1;transform:scale(1.15)}}
@keyframes tickerscroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.mplayed-lbl{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#5fa89e}
.mplayed-val{font-family:var(--F);font-size:20px;color:#00c4b4;letter-spacing:1px}
.mplayed-tot{color:#5fa89e;font-size:16px}
.breakdown-cell{background:#000;border:1px solid #1a3a3a;border-radius:6px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between}
.cap-bar-wrap{background:#0a1a1a;border:2px solid #fff;border-radius:8px;padding:14px 18px;margin-bottom:16px}
.cap-bar-row{display:flex;justifyContent:space-between;align-items:baseline;margin-bottom:8px}
.cap-bar-track{height:10px;border-radius:5px;background:#111;overflow:hidden}
.cap-bar-fill{height:100%;transition:width .2s}
.nfl-select{width:100%;background:#000;color:#fff;border:1px solid #333;border-radius:6px;padding:10px 12px;font-size:14px;font-family:var(--B)}
.nfl-select:focus{outline:none;border-color:#00c4b4}
.nfl-slot-lbl{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#5fa89e;margin-bottom:5px;display:block}
`;

function RB({rank}) {
  return <span className={`rbadge ${rank===1?'r1':rank===2?'r2':rank===3?'r3':''}`}>{rank}</span>;
}

// ── WC ENTRY FORM ─────────────────────────────────────────────────────────────
function WCEntryForm() {
  const isOpen = new Date() < DEADLINE;
  const [step, setStep] = useState("lookup");
  const [lookupName, setLookupName] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [existingEntries, setExistingEntries] = useState([]);
  const [entryNumber, setEntryNumber] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [picks, setPicks] = useState({});
  const [goldenBoot, setGoldenBoot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const totalGroups = WC_GROUPS.length;
  const pickedCount = Object.keys(picks).length;
  const allPicked = pickedCount === totalGroups;
  const canSubmit = allPicked && goldenBoot && !submitting;

  const entryFromRow = (entry) => {
    const p = {};
    for (let i = 1; i <= 12; i++) p["group"+i] = entry["group"+i] || "";
    return p;
  };

  const handleLookup = () => {
    setLookupError("");
    if (!lookupName.trim()) { setLookupError("Please enter your name."); return; }
    if (!lookupEmail.trim() || !lookupEmail.includes("@")) { setLookupError("Please enter a valid email."); return; }
    setLookupLoading(true);
    fetch(SUBMIT_URL + "?email=" + encodeURIComponent(lookupEmail.trim()))
      .then(r => r.json())
      .then(data => {
        const entries = data.submissions || [];
        setExistingEntries(entries);
        setLookupLoading(false);
        if (entries.length === 0) { setEntryNumber(1); setIsEditing(false); setPicks({}); setGoldenBoot(""); setStep("form"); }
        else { setStep("choose"); }
      })
      .catch(() => { setLookupError("Could not check entries. Try again."); setLookupLoading(false); });
  };

  const handleChooseEdit = (entry) => {
    setEntryNumber(entry.entryNumber || 1); setIsEditing(true);
    setPicks(entryFromRow(entry)); setGoldenBoot(entry.goldenBoot || ""); setStep("form");
  };

  const handleChooseNew = () => { setEntryNumber(2); setIsEditing(false); setPicks({}); setGoldenBoot(""); setStep("form"); };

  const handleSubmit = () => {
    setError("");
    if (!allPicked) { setError("Please pick one team from every group."); return; }
    if (!goldenBoot) { setError("Please select a Golden Boot pick."); return; }
    setSubmitting(true);
    const payload = { name: lookupName.trim(), email: lookupEmail.trim(), goldenBoot, entryNumber, ...picks };
    fetch(SUBMIT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(() => { setSubmitted(true); setSubmitting(false); })
      .catch(() => { setError("Something went wrong. Please try again."); setSubmitting(false); });
  };

  const resetAll = () => {
    setStep("lookup"); setLookupEmail(""); setLookupName(""); setExistingEntries([]);
    setPicks({}); setGoldenBoot(""); setSubmitted(false); setError(""); setIsEditing(false);
  };

  if (!isOpen) return (
    <div style={{textAlign:"center",padding:"60px 24px"}}>
      <div style={{fontSize:64,marginBottom:16}}>🔒</div>
      <div style={{fontFamily:"var(--F)",fontSize:36,letterSpacing:2,color:"#e84545",marginBottom:12}}>SUBMISSIONS CLOSED</div>
      <div style={{color:"#5fa89e",fontSize:16}}>The deadline for World Cup picks has passed.</div>
    </div>
  );

  if (submitted) return (
    <div className="success-screen">
      <div className="success-icon">{isEditing ? "✏️" : "🎉"}</div>
      <div className="success-title">{isEditing ? "PICKS UPDATED!" : "YOU'RE IN!"}</div>
      <div className="success-sub">{isEditing ? `Entry ${entryNumber} updated, ${lookupName.split(" ")[0]}!` : `Submitted! Good luck ${lookupName.split(" ")[0]}!`}</div>
      <div className="picks-summary">
        <div style={{fontFamily:"var(--F)",fontSize:16,letterSpacing:1,color:"#00c4b4",marginBottom:12}}>YOUR PICKS</div>
        {WC_GROUPS.map(g => (
          <div className="picks-summary-row" key={g.group}>
            <span className="picks-summary-label">Group {g.group}{g.multiplier>1?` (${g.multiplier}x)`:""}</span>
            <span className="picks-summary-value">{picks["group"+g.group]||"—"}</span>
          </div>
        ))}
        <div className="picks-summary-row">
          <span className="picks-summary-label">Golden Boot</span>
          <span className="picks-summary-value">{goldenBoot||"—"}</span>
        </div>
      </div>
      <button className="submit-btn" onClick={resetAll}>BACK / NEW ENTRY</button>
    </div>
  );

  if (step === "lookup") return (
    <div style={{maxWidth:500,margin:"0 auto"}}>
      <div className="dbadge" style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",marginBottom:16,borderRadius:8,width:"100%"}}>
        <div style={{fontSize:28}}>⏰</div>
        <div>
          <div style={{fontFamily:"var(--F)",fontSize:18,letterSpacing:1}}>PICKS DUE JUNE 11 - 3:00 PM</div>
          <div style={{fontSize:12,color:"#5fa89e",marginTop:2}}>Entry fee: $35 - Max 2 entries per person</div>
        </div>
      </div>
      <div className="form-section">
        <div className="form-section-hdr"><span><span className="num">01 - </span>GET STARTED</span></div>
        <div className="form-group">
          <label className="form-label">Your Name</label>
          <input className="form-input" placeholder="First and last name" value={lookupName} onChange={e => setLookupName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input className="form-input" type="email" placeholder="your@email.com" value={lookupEmail} onChange={e => setLookupEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLookup()} />
        </div>
        {lookupError && <div className="error-msg" style={{margin:"0 20px 16px"}}>lookupError</div>}
        <div style={{padding:"16px 20px"}}>
          <button className="submit-btn" onClick={handleLookup} disabled={lookupLoading}>{lookupLoading ? "CHECKING..." : "CONTINUE"}</button>
        </div>
      </div>
      <div style={{padding:"14px 18px",background:"#000",border:"2px solid #fff",borderRadius:8,fontSize:13,color:"#5fa89e",lineHeight:1.7}}>
        By submitting you agree to pay the <strong style={{color:"#fff"}}>$35 entry fee</strong>. Payment can be sent through Zelle to <strong style={{color:"#00c4b4"}}>scott.wbeverly@gmail.com</strong> or contact that email with any questions. Once the tournament starts, pool entries will be announced on this site, along with an email to the group. Thanks for joining and good luck!
      </div>
    </div>
  );

  if (step === "choose") return (
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div className="form-section">
        <div className="form-section-hdr"><span>FOUND YOUR {existingEntries.length === 1 ? "ENTRY" : "ENTRIES"}</span></div>
        <div style={{padding:20}}>
          <div style={{fontSize:14,color:"#5fa89e",marginBottom:20}}>
            Hi <strong style={{color:"#fff"}}>{lookupName.split(" ")[0]}</strong>! Found {existingEntries.length} existing {existingEntries.length === 1 ? "entry" : "entries"} for <strong style={{color:"#00c4b4"}}>{lookupEmail}</strong>.
          </div>
          {existingEntries.map((entry, i) => (
            <div key={i} style={{background:"#0a1a1a",border:"1px solid #fff",borderRadius:8,padding:16,marginBottom:12}}>
              <div style={{fontFamily:"var(--F)",fontSize:18,color:"#00c4b4",marginBottom:10,letterSpacing:1}}>ENTRY {entry.entryNumber || i+1}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 16px",marginBottom:12}}>
                {WC_GROUPS.map(g => (
                  <div key={g.group} style={{fontSize:12,display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid #111"}}>
                    <span style={{color:"#5fa89e"}}>Group {g.group}{g.multiplier>1?` (${g.multiplier}x)`:""}</span>
                    <span style={{color:"#fff",fontWeight:600}}>{entry["group"+g.group]||"—"}</span>
                  </div>
                ))}
              </div>
              <button className="submit-btn" style={{fontSize:16,padding:12}} onClick={() => handleChooseEdit(entry)}>EDIT THIS ENTRY</button>
            </div>
          ))}
          {existingEntries.length < 2 && (
            <button className="submit-btn" style={{background:"#0a1a1a",color:"#00c4b4",borderColor:"#00c4b4",fontSize:16,padding:12,marginTop:8}} onClick={handleChooseNew}>+ SUBMIT A SECOND ENTRY</button>
          )}
          <div style={{marginTop:12,textAlign:"center"}}>
            <button onClick={resetAll} style={{background:"transparent",border:"none",color:"#5fa89e",cursor:"pointer",fontSize:13,textDecoration:"underline"}}>Use a different email</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{background:"#0a1a1a",border:"2px solid #00c4b4",borderRadius:8,padding:"12px 18px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontFamily:"var(--F)",fontSize:18,letterSpacing:1,color:"#00c4b4"}}>{isEditing ? "EDITING ENTRY " + entryNumber : "NEW ENTRY"}</div>
          <div style={{fontSize:12,color:"#5fa89e",marginTop:2}}>{lookupName} - {lookupEmail}</div>
        </div>
        <button onClick={() => setStep(existingEntries.length > 0 ? "choose" : "lookup")} style={{background:"transparent",border:"1px solid #5fa89e",borderRadius:4,color:"#5fa89e",cursor:"pointer",fontSize:12,padding:"4px 12px"}}>Back</button>
      </div>
      <div className="progress-bar-wrap">
        <div className="progress-label">
          <span>Groups picked: {pickedCount} / {totalGroups}</span>
          <span>{allPicked ? "All groups picked!" : (totalGroups - pickedCount) + " remaining"}</span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{width:((pickedCount/totalGroups)*100)+"%"}}/></div>
      </div>
      <div className="form-section">
        <div className="form-section-hdr"><span><span className="num">01 - </span>PICK YOUR 12 TEAMS</span><span style={{fontSize:13,fontFamily:"var(--B)",fontWeight:400,color:"#5fa89e"}}>1 team per group</span></div>
        {WC_GROUPS.map(g => {
          const picked = picks["group"+g.group];
          return (
            <div className="form-group" key={g.group}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div>
                  <div style={{fontFamily:"var(--F)",fontSize:16,letterSpacing:1,color:"#00c4b4"}}>
                    Pool Group {g.group} {g.multiplier===2?<span className="m2x">2x DOUBLE</span>:g.multiplier===3?<span className="m3x">3x TRIPLE</span>:null}
                  </div>
                  {picked && <div style={{fontSize:12,color:"#5fa89e",marginTop:2}}>Selected: <strong style={{color:"#fff"}}>{picked}</strong></div>}
                </div>
                <div style={{width:22,height:22,borderRadius:"50%",border:"2px solid "+(picked?"#00c4b4":"#333"),background:picked?"#00c4b4":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#000",fontWeight:700}}>{picked?"✓":""}</div>
              </div>
              <div className="team-select-grid">
                {g.teams.map(team => (
                  <button key={team} className={"team-btn"+(picked===team?" sel":"")}
                    onClick={() => setPicks(prev => ({...prev,["group"+g.group]:team}))}>
                    {picked===team?"✓ ":""}{team}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="form-section">
        <div className="form-section-hdr"><span><span className="num">02 - </span>GOLDEN BOOT PICK</span></div>
        <div className="form-group">
          <label className="form-label">Who will score the most goals in the tournament?</label>
          <div style={{fontSize:12,color:"#5fa89e",marginBottom:8}}>$5 from each entry goes to whoever picks the correct Golden Boot winner.</div>
          <select className="gb-select" value={goldenBoot} onChange={e => setGoldenBoot(e.target.value)}>
            <option value="">Select a player</option>
            {GOLDEN_BOOT_PLAYERS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      {error && <div className="error-msg">{error}</div>}
      <div className="form-section" style={{padding:20}}>
        <button className="submit-btn" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? "SAVING..." : canSubmit ? (isEditing ? "SAVE CHANGES" : "SUBMIT MY PICKS") : "COMPLETE ALL FIELDS " + (!allPicked ? "(" + (totalGroups-pickedCount) + " left)" : "")}
        </button>
      </div>
    </div>
  );
}

// ── NFL ENTRY FORM ────────────────────────────────────────────────────────────
const NFL_CAP = 146;

// A type-to-filter dropdown, since scrolling a 100-option native <select> on mobile is painful.
// Still browsable without typing -- focusing shows the full list, typing narrows it.
// Treats curly and straight apostrophes as the same character -- iOS autocorrect
// silently converts ' to ' as you type, which would otherwise break matching on
// names like Ja'Marr Chase or De'Von Achane.
const normApostrophe = (s) => s.toLowerCase().replace(/[\u2018\u2019]/g, "'");

function SearchSelect({ options, value, onChange, excludeSet, placeholder }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find(o => o.value === value);
  const filtered = query.trim()
    ? options.filter(o => normApostrophe(o.label).includes(normApostrophe(query.trim())))
    : options;

  const openModal = () => { setQuery(""); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setQuery(""); };
  const pick = (o) => { onChange(o.value); closeModal(); };

  return (
    <>
      <div
        onClick={openModal}
        className="nfl-select"
        style={{cursor:"pointer", color: selected ? "#fff" : "#5fa89e"}}
      >
        {selected ? selected.label : (placeholder || "Tap to select")}
      </div>

      {modalOpen && (
        <div style={{position:"fixed", inset:0, zIndex:100, background:"#000", display:"flex", flexDirection:"column"}}>
          <div style={{display:"flex", alignItems:"center", gap:10, padding:"14px 16px", borderBottom:"2px solid #1a3a3a", background:"#0a1a1a"}}>
            <input
              autoFocus
              className="form-input"
              style={{flex:1, margin:0, fontSize:16}}
              placeholder={placeholder || "Search..."}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button onClick={closeModal} style={{
              background:"transparent", border:"1px solid #5fa89e", borderRadius:6,
              color:"#5fa89e", padding:"10px 14px", fontSize:14, cursor:"pointer", flexShrink:0,
            }}>Cancel</button>
          </div>
          <div style={{flex:1, overflowY:"auto"}}>
            {filtered.length === 0 && <div style={{padding:24, color:"#5fa89e", textAlign:"center"}}>No matches</div>}
            {filtered.map(o => {
              const isExcluded = excludeSet.has(o.value) && o.value !== value;
              return (
                <div
                  key={o.value}
                  onClick={() => { if (!isExcluded) pick(o); }}
                  style={{
                    padding:"16px 18px", fontSize:16, borderBottom:"1px solid #1a3a3a",
                    cursor: isExcluded ? "default" : "pointer",
                    color: isExcluded ? "#3a5a5a" : (o.value === value ? "#00c4b4" : "#fff"),
                    background: o.value === value ? "rgba(0,196,180,.08)" : "transparent",
                  }}
                >
                  {o.label}{isExcluded ? " — already picked" : ""}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function NFLEntryForm() {
  const isOpen = new Date() < NFL_DEADLINE;
  const [step, setStep] = useState("lookup");
  const [mode, setMode] = useState("new"); // "new" or "edit" -- just affects copy/framing
  const [lookupName, setLookupName] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [existingEntries, setExistingEntries] = useState([]);
  const [entryNumber, setEntryNumber] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [qb, setQb] = useState(["", ""]);
  const [k, setK] = useState(["", ""]);
  const [players, setPlayers] = useState(["", "", "", "", "", ""]);
  const [swap, setSwap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [existingPinHash, setExistingPinHash] = useState("");
  const [pendingEditEntry, setPendingEditEntry] = useState(null);
  const [pinVerifyInput, setPinVerifyInput] = useState("");
  const [pinVerifyError, setPinVerifyError] = useState("");
  const [pinVerifying, setPinVerifying] = useState(false);
  const [knownEntries, setKnownEntries] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveWarning, setSaveWarning] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!NFL_ENTRIES_CSV_URL) return;
    fetch(NFL_ENTRIES_CSV_URL).then(r => r.text()).then(t => {
      const rows = parseNflEntriesCSV(t);
      const seen = new Set();
      const unique = [];
      for (const r of rows) {
        const key = (r.email || "").toLowerCase();
        if (key && !seen.has(key)) { seen.add(key); unique.push({name: r.name, email: r.email}); }
      }
      setKnownEntries(unique);
    }).catch(() => {}); // autocomplete is a nicety -- fail silently, the form still works without it
  }, []);

  const nameSuggestions = lookupName.trim().length >= 2
    ? knownEntries.filter(e => normApostrophe(e.name).includes(normApostrophe(lookupName.trim()))).slice(0, 5)
    : [];

  const qbSalary = (t) => NFL_QB_TEAMS.find(x => x.team === t)?.tds || 0;
  const kSalary = (t) => NFL_KICKER_TEAMS.find(x => x.team === t)?.pts || 0;
  const pSalary = (n) => NFL_PLAYER_POOL.find(x => x.name === n)?.tds || 0;

  const capUsed = qb.reduce((s, t) => s + qbSalary(t), 0)
    + k.reduce((s, t) => s + kSalary(t), 0)
    + players.reduce((s, n) => s + pSalary(n), 0);
  const overCap = capUsed > NFL_CAP;

  const allSlotsFilled = qb.every(Boolean) && k.every(Boolean) && players.every(Boolean) && swap;
  const rosterNames = [...players, swap].filter(Boolean);
  const noDupePlayers = new Set(rosterNames).size === rosterNames.length;
  const noDupeQb = new Set(qb.filter(Boolean)).size === qb.filter(Boolean).length;
  const noDupeK = new Set(k.filter(Boolean)).size === k.filter(Boolean).length;
  const pinValid = !pin.trim() || /^\d{4,}$/.test(pin.trim());
  const canSubmit = allSlotsFilled && !overCap && noDupePlayers && noDupeQb && noDupeK && pinValid && !submitting;

  const entryFromRow = (entry) => {
    setQb([entry.qb1 || "", entry.qb2 || ""]);
    setK([entry.k1 || "", entry.k2 || ""]);
    setPlayers([1,2,3,4,5,6].map(i => entry["player"+i] || ""));
    setSwap(entry.swap || "");
    setTeamName(entry.teamName || "");
    setExistingPinHash(entry.pinHash || "");
    setPin("");
  };

  const handleLookup = (nameOverride, emailOverride) => {
    const useName = nameOverride ?? lookupName;
    const useEmail = emailOverride ?? lookupEmail;
    setLookupError("");
    if (!useName.trim()) { setLookupError("Please enter your name."); return; }
    if (!useEmail.trim() || !useEmail.includes("@")) { setLookupError("Please enter a valid email."); return; }
    if (!NFL_SUBMIT_URL) { setLookupError("Picks aren't connected yet — check back soon."); return; }
    setLookupLoading(true);
    fetch(NFL_SUBMIT_URL + "?email=" + encodeURIComponent(useEmail.trim()))
      .then(r => r.json())
      .then(data => {
        const entries = data.submissions || [];
        setExistingEntries(entries);
        setLookupLoading(false);
        if (entries.length === 0) { setEntryNumber(1); setIsEditing(false); setStep("form"); }
        else { setStep("choose"); }
      })
      .catch(() => { setLookupError("Could not check entries. Try again."); setLookupLoading(false); });
  };

  const handleSelectSuggestion = (entry) => {
    setLookupName(entry.name); setLookupEmail(entry.email); setShowSuggestions(false);
    handleLookup(entry.name, entry.email);
  };

  const handleChooseEdit = (entry) => {
    if (entry.pinHash) {
      setPendingEditEntry(entry); setPinVerifyInput(""); setPinVerifyError(""); setStep("pin");
      return;
    }
    setEntryNumber(entry.entryNumber || 1); setIsEditing(true);
    entryFromRow(entry); setStep("form");
  };

  const handleVerifyPin = async () => {
    setPinVerifyError("");
    if (!pinVerifyInput.trim()) { setPinVerifyError("Enter your PIN."); return; }
    setPinVerifying(true);
    const hash = await hashPin(pinVerifyInput.trim());
    setPinVerifying(false);
    if (hash === pendingEditEntry.pinHash) {
      setEntryNumber(pendingEditEntry.entryNumber || 1); setIsEditing(true);
      entryFromRow(pendingEditEntry); setStep("form");
    } else {
      setPinVerifyError("That PIN doesn't match. Try again, or contact Scott if you forgot it.");
    }
  };

  const handleChooseNew = () => {
    setEntryNumber(existingEntries.length + 1); setIsEditing(false);
    setQb(["",""]); setK(["",""]); setPlayers(["","","","","",""]); setSwap(""); setTeamName("");
    setPin(""); setExistingPinHash("");
    setStep("form");
  };

  const displayName = (teamName.trim() || lookupName.trim());

  const handleSubmit = async () => {
    setError(""); setSaveWarning("");
    if (!allSlotsFilled) { setError("Please fill every slot, including your Swap Player."); return; }
    if (!noDupeQb) { setError("Your two Team QB picks must be different teams."); return; }
    if (!noDupeK) { setError("Your two Team Kicker picks must be different teams."); return; }
    if (!noDupePlayers) { setError("Each player (including your Swap Player) must be different."); return; }
    if (overCap) { setError(`Your total is ${capUsed}, which is over the ${NFL_CAP} cap.`); return; }
    if (!pinValid) { setError("PIN should be at least 4 digits (numbers only), or leave it blank."); return; }
    setSubmitting(true);
    const finalPinHash = pin.trim() ? await hashPin(pin.trim()) : existingPinHash;
    const payload = {
      name: lookupName.trim(), email: lookupEmail.trim(), entryNumber,
      teamName: teamName.trim(),
      qb1: qb[0], qb2: qb[1], k1: k[0], k2: k[1],
      player1: players[0], player2: players[1], player3: players[2],
      player4: players[3], player5: players[4], player6: players[5],
      swap,
      pinHash: finalPinHash,
    };
    fetch(NFL_SUBMIT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(() => verifySave(payload))
      .catch(() => { setError("Something went wrong. Please try again."); setSubmitting(false); });
  };

  // A no-cors POST can't tell us if it actually worked, or if the Sheet is missing a
  // column that quietly swallows a field (exactly what happened with pinHash before).
  // So immediately re-fetch and check every field actually landed as sent.
  const verifySave = async (payload) => {
    setVerifying(true);
    const fieldLabels = {
      teamName:"Team Name", qb1:"Team QB 1", qb2:"Team QB 2", k1:"Team Kicker 1", k2:"Team Kicker 2",
      player1:"Player 1", player2:"Player 2", player3:"Player 3", player4:"Player 4",
      player5:"Player 5", player6:"Player 6", swap:"Swap Player", pinHash:"PIN",
    };
    try {
      const res = await fetch(NFL_SUBMIT_URL + "?email=" + encodeURIComponent(payload.email));
      const data = await res.json();
      const saved = (data.submissions || []).find(e => Number(e.entryNumber) === Number(payload.entryNumber));
      if (!saved) {
        setSaveWarning("We couldn't confirm your picks were saved. Please check back in a minute, and let Scott know if they're still missing.");
      } else {
        const mismatched = Object.keys(fieldLabels).filter(k => (payload[k] || "") !== (saved[k] || ""));
        if (mismatched.length > 0) {
          setSaveWarning(
            `Everything else saved, but ${mismatched.map(k => fieldLabels[k]).join(", ")} didn't. ` +
            `This usually means a column is missing from the sheet — let Scott know so it can be fixed, then try saving that part again.`
          );
        }
      }
    } catch {
      setSaveWarning("We couldn't confirm your picks were saved. Please check back in a minute, and let Scott know if they're still missing.");
    }
    setVerifying(false); setSubmitted(true); setSubmitting(false);
  };

  const resetAll = () => {
    setStep("lookup"); setLookupEmail(""); setLookupName(""); setExistingEntries([]);
    setQb(["",""]); setK(["",""]); setPlayers(["","","","","",""]); setSwap(""); setTeamName("");
    setSubmitted(false); setError(""); setIsEditing(false); setMode("new");
    setPin(""); setExistingPinHash(""); setPendingEditEntry(null); setPinVerifyInput(""); setPinVerifyError("");
    setSaveWarning("");
  };

  const CapBar = () => (
    <div className="cap-bar-wrap">
      <div className="cap-bar-row" style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
        <span style={{fontFamily:"var(--F)",fontSize:16,letterSpacing:1,color:overCap?"#e84545":"#00c4b4"}}>
          SALARY: {capUsed} / {NFL_CAP}
        </span>
        {overCap && <span style={{fontSize:12,color:"#e84545",fontWeight:700}}>OVER CAP</span>}
      </div>
      <div className="cap-bar-track">
        <div className="cap-bar-fill" style={{width:Math.min(100,(capUsed/NFL_CAP)*100)+"%",background:overCap?"#e84545":"#00c4b4"}}/>
      </div>
      <div style={{fontSize:11,color:"#5fa89e",marginTop:6}}>Your Swap Player's salary is not counted here — it only matters if you use the swap later.</div>
    </div>
  );

  if (!isOpen) return (
    <div style={{textAlign:"center",padding:"60px 24px"}}>
      <div style={{fontSize:64,marginBottom:16}}>🔒</div>
      <div style={{fontFamily:"var(--F)",fontSize:36,letterSpacing:2,color:"#e84545",marginBottom:12}}>SUBMISSIONS CLOSED</div>
      <div style={{color:"#5fa89e",fontSize:16}}>The deadline for NFL Derby picks has passed.</div>
    </div>
  );

  if (submitted) return (
    <div className="success-screen">
      {saveWarning ? (
        <>
          <div className="success-icon">⚠️</div>
          <div className="success-title" style={{color:"#e84545"}}>SAVED, BUT CHECK THIS</div>
        </>
      ) : (
        <>
          <div className="success-icon">{isEditing ? "✏️" : "🏈"}</div>
          <div className="success-title">{isEditing ? "PICKS UPDATED!" : "YOU'RE IN!"}</div>
        </>
      )}
      <div className="success-sub">{isEditing ? `Entry ${entryNumber} updated, ${lookupName.split(" ")[0]}!` : `Submitted! Good luck ${lookupName.split(" ")[0]}!`}</div>
      {saveWarning && (
        <div style={{
          background:"rgba(232,69,69,.1)", border:"2px solid #e84545", borderRadius:8,
          padding:"14px 18px", marginBottom:24, color:"#fff", fontSize:14, lineHeight:1.6, textAlign:"left",
        }}>
          {saveWarning}
        </div>
      )}
      <div className="picks-summary">
        <div style={{fontFamily:"var(--F)",fontSize:16,letterSpacing:1,color:"#00c4b4",marginBottom:12}}>YOUR ROSTER</div>
        <div className="picks-summary-row"><span className="picks-summary-label">Shown On Site As</span><span className="picks-summary-value">{displayName}</span></div>
        <div className="picks-summary-row"><span className="picks-summary-label">Team QB 1</span><span className="picks-summary-value">{qb[0]}</span></div>
        <div className="picks-summary-row"><span className="picks-summary-label">Team QB 2</span><span className="picks-summary-value">{qb[1]}</span></div>
        <div className="picks-summary-row"><span className="picks-summary-label">Team Kicker 1</span><span className="picks-summary-value">{k[0]}</span></div>
        <div className="picks-summary-row"><span className="picks-summary-label">Team Kicker 2</span><span className="picks-summary-value">{k[1]}</span></div>
        {players.map((p,i) => (
          <div className="picks-summary-row" key={i}><span className="picks-summary-label">Player {i+1}</span><span className="picks-summary-value">{p}</span></div>
        ))}
        <div className="picks-summary-row"><span className="picks-summary-label">Swap Player</span><span className="picks-summary-value">{swap}</span></div>
        <div className="picks-summary-row"><span className="picks-summary-label">Salary Used</span><span className="picks-summary-value">{capUsed} / {NFL_CAP}</span></div>
      </div>
      <button className="submit-btn" onClick={resetAll}>BACK / NEW ENTRY</button>
    </div>
  );

  if (step === "lookup") return (
    <div style={{maxWidth:500,margin:"0 auto"}}>
      <div className="dbadge" style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",marginBottom:16,borderRadius:8,width:"100%"}}>
        <div style={{fontSize:28}}>⏰</div>
        <div>
          <div style={{fontFamily:"var(--F)",fontSize:18,letterSpacing:1}}>PICKS DUE SEPT 9 - 8:00 PM ET</div>
          <div style={{fontSize:12,color:"#5fa89e",marginTop:2}}>Entry fee: 50 units</div>
          <div style={{fontSize:12,color:"#5fa89e",marginTop:2}}>Zelle - scott.wbeverly@gmail.com</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <button onClick={() => setMode("new")} style={{
          padding:"16px 10px", borderRadius:8, cursor:"pointer", textAlign:"center",
          background: mode==="new" ? "#00c4b4" : "#0a1a1a",
          border: mode==="new" ? "2px solid #00c4b4" : "1px solid #1a3a3a",
          color: mode==="new" ? "#000" : "#5fa89e",
        }}>
          <div style={{fontSize:22,marginBottom:4}}>🆕</div>
          <div style={{fontFamily:"var(--F)",fontSize:15,letterSpacing:1}}>FIRST TIME</div>
          <div style={{fontSize:11,marginTop:2,opacity:.85}}>Submit new picks</div>
        </button>
        <button onClick={() => setMode("edit")} style={{
          padding:"16px 10px", borderRadius:8, cursor:"pointer", textAlign:"center",
          background: mode==="edit" ? "#00c4b4" : "#0a1a1a",
          border: mode==="edit" ? "2px solid #00c4b4" : "1px solid #1a3a3a",
          color: mode==="edit" ? "#000" : "#5fa89e",
        }}>
          <div style={{fontSize:22,marginBottom:4}}>✏️</div>
          <div style={{fontFamily:"var(--F)",fontSize:15,letterSpacing:1}}>RETURNING</div>
          <div style={{fontSize:11,marginTop:2,opacity:.85}}>Edit my picks</div>
        </button>
      </div>

      <div className="form-section">
        <div className="form-section-hdr"><span><span className="num">01 - </span>{mode==="edit" ? "FIND YOUR ENTRY" : "GET STARTED"}</span></div>
        {mode==="edit" && (
          <div style={{padding:"14px 20px 0",fontSize:13,color:"#5fa89e",lineHeight:1.6}}>
            Enter the same name and email you used when you submitted, and we'll pull up your picks so you can change them.
          </div>
        )}
        <div className="form-group" style={{position:"relative"}}>
          <label className="form-label">Your Name</label>
          <input
            className="form-input" placeholder="First and last name" value={lookupName}
            onChange={e => { setLookupName(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            autoComplete="off"
          />
          {showSuggestions && nameSuggestions.length > 0 && (
            <div style={{
              position:"absolute", top:"100%", left:0, right:0, zIndex:10, marginTop:4,
              background:"#0a1a1a", border:"1px solid #00c4b4", borderRadius:6, overflow:"hidden",
            }}>
              {nameSuggestions.map((s, i) => (
                <div
                  key={s.email}
                  onMouseDown={() => handleSelectSuggestion(s)}
                  style={{
                    padding:"10px 14px", cursor:"pointer", fontSize:14,
                    borderTop: i>0 ? "1px solid #1a3a3a" : "none",
                  }}
                >
                  <div style={{color:"#fff"}}>{s.name}</div>
                  <div style={{color:"#5fa89e",fontSize:12}}>{s.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input className="form-input" type="email" placeholder="your@email.com" value={lookupEmail} onChange={e => setLookupEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLookup()} />
        </div>
        {lookupError && <div className="error-msg" style={{margin:"0 20px 16px"}}>{lookupError}</div>}
        <div style={{padding:"16px 20px"}}>
          <button className="submit-btn" onClick={() => handleLookup()} disabled={lookupLoading}>
            {lookupLoading ? "CHECKING..." : mode==="edit" ? "FIND MY PICKS" : "CONTINUE"}
          </button>
        </div>
      </div>
      <div style={{padding:"14px 18px",background:"#000",border:"2px solid #fff",borderRadius:8,fontSize:13,color:"#5fa89e",lineHeight:1.7}}>
        By submitting you agree to pay the <strong style={{color:"#fff"}}>50-unit entry fee</strong>. Payment can be sent through Zelle — contact Scott directly for details. Once the season starts, pool entries will be announced on this site. Thanks for joining and good luck!
      </div>
    </div>
  );

  if (step === "pin") return (
    <div style={{maxWidth:440,margin:"0 auto"}}>
      <div className="form-section">
        <div className="form-section-hdr"><span>🔒 ENTER YOUR PIN</span></div>
        <div style={{padding:20}}>
          <div style={{fontSize:14,color:"#5fa89e",marginBottom:16,lineHeight:1.6}}>
            {pendingEditEntry?.teamName || "This entry"} is protected with a PIN. Enter it to edit these picks.
          </div>
          <input
            className="form-input" type="password" inputMode="numeric" placeholder="4-digit PIN"
            value={pinVerifyInput} onChange={e => setPinVerifyInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleVerifyPin()}
            style={{textAlign:"center",fontSize:24,letterSpacing:6}}
          />
          {pinVerifyError && <div className="error-msg" style={{marginTop:12}}>{pinVerifyError}</div>}
          <button className="submit-btn" style={{marginTop:16}} onClick={handleVerifyPin} disabled={pinVerifying}>
            {pinVerifying ? "CHECKING..." : "UNLOCK"}
          </button>
          <div style={{textAlign:"center",marginTop:14}}>
            <button onClick={() => setStep("choose")} style={{background:"transparent",border:"none",color:"#5fa89e",cursor:"pointer",fontSize:13,textDecoration:"underline"}}>Back</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (step === "choose") return (
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div className="form-section">
        <div className="form-section-hdr"><span>FOUND YOUR {existingEntries.length === 1 ? "ENTRY" : "ENTRIES"}</span></div>
        <div style={{padding:20}}>
          <div style={{fontSize:14,color:"#5fa89e",marginBottom:20}}>
            Hi <strong style={{color:"#fff"}}>{lookupName.split(" ")[0]}</strong>! Found {existingEntries.length} existing {existingEntries.length === 1 ? "entry" : "entries"} for <strong style={{color:"#00c4b4"}}>{lookupEmail}</strong>.
          </div>
          {existingEntries.map((entry, i) => (
            <div key={i} style={{background:"#0a1a1a",border:"1px solid #fff",borderRadius:8,padding:16,marginBottom:12}}>
              <div style={{fontFamily:"var(--F)",fontSize:18,color:"#00c4b4",marginBottom:2,letterSpacing:1}}>
                {entry.pinHash && <span style={{marginRight:6}}>🔒</span>}
                {entry.teamName ? entry.teamName : "ENTRY " + (entry.entryNumber || i+1)}
              </div>
              {entry.teamName && <div style={{fontSize:11,color:"#5fa89e",marginBottom:12}}>Entry {entry.entryNumber || i+1}</div>}
              <button className="submit-btn" style={{fontSize:16,padding:12}} onClick={() => handleChooseEdit(entry)}>EDIT THIS ENTRY</button>
            </div>
          ))}
          {existingEntries.length < 2 ? (
            <button className="submit-btn" style={{background:"#0a1a1a",color:"#00c4b4",borderColor:"#00c4b4",fontSize:16,padding:12,marginTop:8}} onClick={handleChooseNew}>+ SUBMIT A SECOND ENTRY</button>
          ) : (
            <div style={{textAlign:"center",fontSize:12,color:"#5fa89e",padding:"10px 0"}}>You've reached the 2-entry limit per person.</div>
          )}
          <div style={{marginTop:12,textAlign:"center"}}>
            <button onClick={resetAll} style={{background:"transparent",border:"none",color:"#5fa89e",cursor:"pointer",fontSize:13,textDecoration:"underline"}}>Use a different email</button>
          </div>
        </div>
      </div>
    </div>
  );

  const pickedPlayerSet = new Set(players.filter(Boolean));
  const pickedQbSet = new Set(qb.filter(Boolean));
  const pickedKSet = new Set(k.filter(Boolean));

  return (
    <div style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{background:"#0a1a1a",border:"2px solid #00c4b4",borderRadius:8,padding:"12px 18px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontFamily:"var(--F)",fontSize:18,letterSpacing:1,color:"#00c4b4"}}>{isEditing ? "EDITING ENTRY " + entryNumber : "NEW ENTRY"}</div>
          <div style={{fontSize:12,color:"#5fa89e",marginTop:2}}>{lookupName} - {lookupEmail}</div>
        </div>
        <button onClick={() => setStep(existingEntries.length > 0 ? "choose" : "lookup")} style={{background:"transparent",border:"1px solid #5fa89e",borderRadius:4,color:"#5fa89e",cursor:"pointer",fontSize:12,padding:"4px 12px"}}>Back</button>
      </div>

      <div className="form-section">
        <div className="form-section-hdr"><span>TEAM NAME <span style={{color:"#5fa89e",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></span></div>
        <div style={{padding:20}}>
          <input className="form-input" placeholder="e.g. The Gridiron Gurus" value={teamName} onChange={e => setTeamName(e.target.value)} maxLength={40} />
          <div style={{fontSize:12,color:"#5fa89e",marginTop:8}}>
            This is what shows up on the site. Leave it blank and we'll just use your name ({lookupName || "your name"}) instead.
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-hdr"><span>🔒 {existingPinHash ? "CHANGE PIN" : "SET A PIN"} <span style={{color:"#5fa89e",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></span></div>
        <div style={{padding:20}}>
          <input
            className="form-input" type="password" inputMode="numeric" placeholder="4-digit PIN" maxLength={8}
            value={pin} onChange={e => setPin(e.target.value)} style={{maxWidth:200}}
          />
          <div style={{fontSize:12,color:"#5fa89e",marginTop:8,lineHeight:1.6}}>
            {existingPinHash
              ? "Leave blank to keep your current PIN. Enter a new one to change it."
              : "Protects your picks from being changed by someone else. We never store the actual PIN — only a scrambled version we can check it against."}
          </div>
        </div>
      </div>

      <div style={{
        position:"fixed", bottom:18, right:14, zIndex:50,
        background: overCap ? "#e84545" : "#0a1a1a",
        border:`2px solid ${overCap ? "#e84545" : "#00c4b4"}`,
        borderRadius:22, padding:"9px 16px",
        boxShadow:"0 4px 14px rgba(0,0,0,.5)",
        fontFamily:"var(--F)", fontSize:15, letterSpacing:1,
        color: overCap ? "#fff" : "#00c4b4",
        display:"flex", alignItems:"center", gap:6,
      }}>
        <span style={{fontSize:11,opacity:.75,fontFamily:"var(--B)",letterSpacing:0}}>SALARY</span>
        {capUsed} / {NFL_CAP}
      </div>

      <CapBar/>

      <div className="form-section">
        <div className="form-section-hdr"><span><span className="num">01 - </span>TEAM QB (pick 2)</span></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12,padding:20}}>
          {[0,1].map(i => (
            <div key={i}>
              <label className="nfl-slot-lbl">Team QB {i+1}</label>
              <SearchSelect
                options={NFL_QB_TEAMS.map(t => ({value: t.team, label: `${t.team} (${t.tds})`}))}
                value={qb[i]} onChange={v => setQb(prev => { const n=[...prev]; n[i]=v; return n; })}
                excludeSet={pickedQbSet} placeholder="Search teams..."
              />
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-hdr"><span><span className="num">02 - </span>TEAM KICKER (pick 2)</span></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12,padding:20}}>
          {[0,1].map(i => (
            <div key={i}>
              <label className="nfl-slot-lbl">Team Kicker {i+1}</label>
              <SearchSelect
                options={NFL_KICKER_TEAMS.map(t => ({value: t.team, label: `${t.team} (${t.pts})`}))}
                value={k[i]} onChange={v => setK(prev => { const n=[...prev]; n[i]=v; return n; })}
                excludeSet={pickedKSet} placeholder="Search teams..."
              />
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-hdr"><span><span className="num">03 - </span>SKILL PLAYERS (pick 6)</span></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12,padding:20}}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i}>
              <label className="nfl-slot-lbl">Player {i+1}</label>
              <SearchSelect
                options={NFL_PLAYER_POOL.map(p => ({value: p.name, label: `${p.name} (${p.team}, ${p.tds})`}))}
                value={players[i]} onChange={v => setPlayers(prev => { const n=[...prev]; n[i]=v; return n; })}
                excludeSet={swap ? new Set([...pickedPlayerSet, swap]) : pickedPlayerSet}
                placeholder="Search players..."
              />
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-hdr"><span><span className="num">04 - </span>SWAP PLAYER</span></div>
        <div style={{padding:20}}>
          <div style={{fontSize:12,color:"#5fa89e",marginBottom:10}}>
            Designate a 7th player who can replace one of your 6 before Week 9. Doesn't count toward your salary cap now — but can't push you over 146 at the time you swap him in.
          </div>
          <SearchSelect
            options={NFL_PLAYER_POOL.map(p => ({value: p.name, label: `${p.name} (${p.team}, ${p.tds})`}))}
            value={swap} onChange={setSwap}
            excludeSet={pickedPlayerSet} placeholder="Search players..."
          />
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}
      <div className="form-section" style={{padding:20}}>
        <button className="submit-btn" onClick={handleSubmit} disabled={!canSubmit}>
          {verifying ? "VERIFYING..." : submitting ? "SAVING..." : canSubmit ? (isEditing ? "SAVE CHANGES" : "SUBMIT MY PICKS") : overCap ? "OVER SALARY CAP" : !pinValid ? "PIN MUST BE 4+ DIGITS" : "COMPLETE ALL SLOTS"}
        </button>
      </div>
    </div>
  );
}

// ── NFL STANDINGS ─────────────────────────────────────────────────────────────
const NFL_PERIOD_TABS = ["Period 1","Period 2","Period 3","Period 4","Overall"];
const NFL_PERIOD_SUBLABEL = {
  "Period 1":"Weeks 1-4", "Period 2":"Weeks 5-8", "Period 3":"Weeks 9-13",
  "Period 4":"Weeks 14-18", "Overall":"Full Season",
};

function NFLStandings() {
  const [period, setPeriod] = useState("Overall");
  const [entries, setEntries] = useState(null);
  const [entriesErr, setEntriesErr] = useState("");
  const [stats, setStats] = useState(null);
  const [statsErr, setStatsErr] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!NFL_ENTRIES_CSV_URL) { setEntriesErr("Standings aren't connected yet."); return; }
    fetch(NFL_ENTRIES_CSV_URL).then(r => r.text()).then(t => setEntries(parseNflEntriesCSV(t)))
      .catch(() => setEntriesErr("Could not load entries."));
  }, []);

  useEffect(() => {
    setStats(null); setStatsErr("");
    fetchPeriodStats(period, NFL_SEASON_YEAR)
      .then(setStats)
      .catch(() => setStatsErr("Could not load stats for this period yet."));
  }, [period]);

  const leaderboard = (entries && stats) ? entries.map(e => {
    const roster = {
      qb: [e.qb1, e.qb2], k: [e.k1, e.k2],
      skill: [e.player1, e.player2, e.player3, e.player4, e.player5, e.player6],
    };
    const {total, breakdown} = scoreRoster(roster, stats);
    const displayName = (e.teamName && e.teamName.trim()) || e.name || "Unnamed";
    return {...e, displayName, total, breakdown};
  }).sort((a,b) => b.total - a.total) : [];

  return (
    <div>
      <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:16,paddingBottom:2}}>
        {NFL_PERIOD_TABS.map(p => (
          <button key={p} onClick={() => { setPeriod(p); setExpanded(null); }}
            style={{
              flex:"0 0 auto", padding:"10px 16px", borderRadius:6, cursor:"pointer",
              fontFamily:"var(--F)", fontSize:15, letterSpacing:1, whiteSpace:"nowrap",
              background: period===p ? "#00c4b4" : "#0a1a1a",
              color: period===p ? "#000" : "#5fa89e",
              border: period===p ? "2px solid #00c4b4" : "1px solid #1a3a3a",
            }}>
            {p==="Overall" ? "OVERALL" : p.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{fontSize:12,color:"#5fa89e",marginBottom:16}}>{NFL_PERIOD_SUBLABEL[period]}</div>

      {entriesErr && <div className="error-msg">{entriesErr}</div>}
      {!entriesErr && !entries && <div style={{color:"#5fa89e",padding:20}}>Loading entries...</div>}
      {statsErr && <div className="error-msg">{statsErr}</div>}

      {entries && stats && (
        <div className="card">
          <div className="chdr">
            NFL Derby - {period}
            <span style={{marginLeft:"auto",fontSize:12,fontFamily:"var(--B)",color:"#5fa89e",fontWeight:400}}>
              Click a name for the roster breakdown
            </span>
          </div>
          {leaderboard.length === 0 && <div style={{padding:20,color:"#5fa89e"}}>No entries yet.</div>}
          {leaderboard.map((e, i) => (
            <div key={e.email + e.entryNumber}>
              <div
                onClick={() => setExpanded(expanded === i ? null : i)}
                style={{
                  display:"flex", alignItems:"center", gap:12, padding:"14px 20px",
                  borderTop: i>0 ? "1px solid #1a2a2a" : "none", cursor:"pointer",
                }}
              >
                <div style={{
                  width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center",
                  justifyContent:"center", fontFamily:"var(--F)", fontSize:14,
                  background: i===0?"#00c4b4":i===1?"#c0c0c0":i===2?"#cd7f32":"#1a2a2a",
                  color: i<3 ? "#000" : "#5fa89e",
                }}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600}}>{e.displayName}</div>
                  {e.teamName && <div style={{fontSize:12,color:"#5fa89e"}}>{e.name}</div>}
                </div>
                <div style={{fontFamily:"var(--F)",fontSize:22,color:"#00c4b4"}}>{e.total}</div>
              </div>
              {expanded === i && (
                <div style={{padding:"0 20px 16px 60px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {e.breakdown.map((b,j) => (
                    <div key={j} className="breakdown-cell">
                      <span style={{fontSize:12,color:"#5fa89e"}}>{b.slot}: {b.name}</span>
                      <span style={{fontSize:13,fontWeight:700}}>{b.pts}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── WORLD CUP PAGE ────────────────────────────────────────────────────────────
function WorldCup({submissions, wcScores, wcScorers}) {
  const isLocked = new Date() >= DEADLINE;
  const [sec, setSec] = useState(isLocked ? "leaderboard" : "enter");
  const [apiLoading, setApiLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState("");
  const [teamStats, setTeamStats] = useState(wcScores || {});
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [ticker, setTicker] = useState([]);

  const loadTicker = () => {
    if (!TICKER_CSV_URL) return;
    fetch(TICKER_CSV_URL).then(r => r.text()).then(t => setTicker(parseTicker(t))).catch(() => {});
  };
  useEffect(() => { loadTicker(); }, []);

  const preTabs = [{id:"enter",label:"Submit Entry"},{id:"entries",label:"All Entries"},{id:"groups",label:"Pool Groups"},{id:"scoring",label:"Scoring"},{id:"rules",label:"Rules"}];
  const liveTabs = [{id:"leaderboard",label:"Leaderboard"},{id:"odds",label:"Win Odds"},{id:"entries",label:"All Entries"},{id:"groups",label:"Pool Groups"},{id:"fifa",label:"FIFA Standings"},{id:"goldenboot",label:"Golden Boot"},{id:"payouts",label:"Payouts"},{id:"scoring",label:"Scoring"},{id:"rules",label:"Rules"}];
  const tabs = isLocked ? liveTabs : preTabs;

  const refreshScores = () => {
    setApiLoading(true);
    loadTicker();
    fetch(SCORES_CSV_URL)
      .then(r => r.text())
      .then(text => {
        setTeamStats(parseScores(text));
        setLastRefresh(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
        setApiLoading(false);
      })
      .catch(() => setApiLoading(false));
  };

  const getScoredEntries = () => {
    return submissions.map(entry => {
      const {total, breakdown} = calcScore(entry, teamStats);
      return {...entry, total, breakdown};
    }).sort((a,b) => b.total - a.total);
  };

  const ownership = (() => {
    const counts = {};
    submissions.forEach(entry => {
      for (let g = 1; g <= 12; g++) {
        const team = entry["group"+g] || "";
        if (!team) continue;
        if (!counts[team]) counts[team] = 0;
        counts[team]++;
      }
    });
    return counts;
  })();
  const ownPct = (team) => submissions.length ? Math.round((ownership[team]||0)/submissions.length*100) : 0;
  const isOut = (team) => !!(team && teamStats[team] && teamStats[team].eliminated);
  const matchesPlayed = (entry) => {
    let n = 0;
    for (let g = 1; g <= 12; g++) {
      const team = entry["group"+g] || "";
      if (team && teamStats[team]) n += (teamStats[team].played || 0);
    }
    return n;
  };
  const matchesTotal = (entry) => {
    let t = 0;
    for (let g = 1; g <= 12; g++) if (entry["group"+g]) t += 3;
    return t;
  };

  // Auto team strength (0-1) from live tournament form: results weighted heavier than goals.
  const teamStrength = (team) => {
    const s = teamStats[team];
    if (!s) return 0;
    const gp = Math.max(s.played || 0, 1);
    const ppg = ((s.wins||0)*3 + (s.draws||0)) / gp;     // 0..3
    const gpg = (s.goals||0) / gp;                        // ~0..3
    const strength = 0.6*(ppg/3) + 0.4*Math.min(gpg/3, 1);
    return Math.max(0.05, Math.min(1, strength));
  };

  // Projected pool finish = points banked + upside from each still-alive team (strength x pool multiplier).
  const FWD_K = 40;
  const getOdds = () => {
    const rows = submissions.map(entry => {
      const { total } = calcScore(entry, teamStats);
      let forward = 0, alive = 0;
      for (let g = 1; g <= 12; g++) {
        const team = entry["group"+g] || "";
        if (!team) continue;
        const st = teamStats[team];
        if (st && !st.eliminated) {
          alive++;
          const mult = g >= 10 ? 3 : g >= 6 ? 2 : 1;
          forward += teamStrength(team) * mult * FWD_K;
        }
      }
      return { entry, current: total, alive, projected: total + forward };
    });
    const P = 3;
    const denom = rows.reduce((a,r) => a + Math.pow(Math.max(r.projected,0), P), 0) || 1;
    rows.forEach(r => { r.winPct = Math.pow(Math.max(r.projected,0), P) / denom * 100; });
    return rows.sort((a,b) => b.projected - a.projected);
  };

  return (
    <div>
      <div className="phdr">
        <div>
          <div className="ptitle">WORLD CUP POOL 2026</div>
          <div style={{fontSize:14,color:"#5fa89e",marginTop:4}}>{isLocked ? "Tournament underway - " + submissions.length + " entries" : "Pick 1 team per Pool Group - 12 teams total"}</div>
        </div>
        <div className="pmeta">
          <div className="pill">Entry: <strong>$35</strong></div>
          <div className="pill">Entries: <strong>{submissions.length}</strong></div>
          {isLocked ? <span className="blive">LIVE</span> : <span className="dbadge">Due: Jun 11 - 3PM</span>}
        </div>
      </div>
      {ticker.length > 0 && (
        <div className="ticker">
          <div className="ticker-tag">THE CRAWL</div>
          <div className="ticker-view">
            <div className="ticker-track">
              {[...ticker, ...ticker].map((t, i) => (
                <span className="ticker-item" key={i}>
                  {t.label && <span className="ticker-chip">{t.label}</span>}
                  {t.msg}
                  <span className="ticker-sep">◆</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="stabs">
        {tabs.map(s => <button key={s.id} className={"stab"+(sec===s.id?" on":"")} onClick={() => setSec(s.id)}>{s.label}</button>)}
      </div>

      {sec==="enter" && <WCEntryForm/>}

      {sec==="leaderboard" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:13,color:"#5fa89e"}}>{lastRefresh ? "Last updated: " + lastRefresh : "Auto-loaded from scores sheet"}</div>
            <button onClick={refreshScores} disabled={apiLoading}
              style={{background:"#00c4b4",border:"none",borderRadius:4,color:"#000",padding:"6px 14px",fontFamily:"var(--F)",fontSize:14,letterSpacing:1,cursor:"pointer",opacity:apiLoading?0.5:1}}>
              {apiLoading ? "REFRESHING..." : "REFRESH SCORES"}
            </button>
          </div>
          {(() => {
            const scored = getScoredEntries();
            return (
              <div>
                <div className="podium">
                  {scored.slice(0,3).map((e,i) => (
                    <div key={i} className={"pod p"+(i+1)}>
                      <div className="pos">{["🥇","🥈","🥉"][i]}</div>
                      <div className="pteam">{e.name}</div>
                      <div className="phr">{e.total}</div>
                      <div className="plbl">POINTS</div>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="chdr">Pool Leaderboard <span style={{marginLeft:"auto",fontSize:12,fontFamily:"var(--B)",color:"#5fa89e",fontWeight:400}}>Click name to see picks</span></div>
                  <table>
                    <thead><tr><th style={{width:48}}>Rank</th><th>Participant</th><th className="r">Points</th></tr></thead>
                    <tbody>
                      {scored.map((e,i) => {
                        const isExp = expandedEntry === i;
                        return (
                          <tr key={i} style={{cursor:"pointer",background:isExp?"rgba(0,196,180,.08)":""}} onClick={() => setExpandedEntry(isExp ? null : i)}>
                            <td><RB rank={i+1}/></td>
                            <td>
                              <div style={{fontWeight:500}}>{e.name}{(e.entryNumber||1)>1&&<span style={{fontSize:11,color:"#5fa89e",marginLeft:8}}>Entry {e.entryNumber}</span>}</div>
                              {isExp && (
                                <div style={{marginTop:8}}>
                                  <div className="mplayed">
                                    <span className="mplayed-lbl">Matches Played</span>
                                    <span className="mplayed-val">{matchesPlayed(e)}<span className="mplayed-tot"> / {matchesTotal(e)}</span></span>
                                  </div>
                                  <div className="breakdown-grid">
                                  {WC_GROUPS.map(g => {
                                    const bd = e.breakdown["group"+g.group];
                                    return (
                                      <div key={g.group} className="breakdown-cell">
                                        <div>
                                          <div style={{fontSize:10,color:"#5fa89e",letterSpacing:1}}>GROUP {g.group}{g.multiplier>1?" - "+g.multiplier+"x":""}</div>
                                          <div style={{fontSize:13,fontWeight:600,color:"#fff"}}><span className={bd&&isOut(bd.team)?"elim":""}>{bd?bd.team:"—"}</span>{bd&&bd.team&&isOut(bd.team)&&<span className="outtag">OUT</span>}{bd&&bd.team&&<span style={{fontSize:10,color:"#5fa89e",marginLeft:6,fontWeight:400}}>{ownPct(bd.team)}%</span>}</div>
                                        </div>
                                        <span style={{fontFamily:"var(--F)",fontSize:18,color:"#00c4b4"}}>{bd?bd.scored:0}</span>
                                      </div>
                                    );
                                  })}
                                  <div className="breakdown-cell" style={{border:"1px solid #00c4b4"}}>
                                    <span style={{fontSize:12,color:"#5fa89e"}}>Golden Boot</span>
                                    <span style={{fontSize:12,fontWeight:600,color:"#fff"}}>{e.goldenBoot||"—"}</span>
                                  </div>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="r"><span className="hn">{e.total}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {sec==="odds" && (
        <div>
          <div className="oddsbanner">
            Live projection of who's most likely to win the pool — based on points already banked, how many of each roster's teams are still alive, and each surviving team's current form (with your 2x/3x pool multipliers applied). This is a model estimate, not betting odds.
          </div>
          {submissions.length === 0 ? (
            <div className="card"><div style={{padding:40,textAlign:"center",color:"#5fa89e"}}>No entries yet.</div></div>
          ) : (() => {
            const odds = getOdds();
            const top = odds.slice(0,5);
            const maxPct = top.length ? (top[0].winPct || 1) : 1;
            return (
              <div className="card">
                <div className="chdr">Live Win Odds - Top 5 <span style={{marginLeft:"auto",fontSize:12,fontFamily:"var(--B)",color:"#5fa89e",fontWeight:400}}>Updates with results</span></div>
                <div style={{padding:"6px 0"}}>
                  {top.map((r,i) => (
                    <div key={i} className="oddsrow">
                      <RB rank={i+1}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="oddsname">{r.entry.name}{(r.entry.entryNumber||1)>1 && <span className="oddsentry">Entry {r.entry.entryNumber}</span>}</div>
                        <div className="oddsmeta">Now {r.current} · Proj {Math.round(r.projected)} · {r.alive}/12 alive</div>
                        <div className="oddsbar"><div className="oddsfill" style={{width:Math.max(4,(r.winPct/maxPct*100))+"%"}}/></div>
                      </div>
                      <div className="oddspct">{r.winPct.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {sec==="entries" && (
        <div>
          {submissions.length === 0
            ? <div className="card"><div style={{padding:40,textAlign:"center",color:"#5fa89e"}}><div style={{fontSize:40,marginBottom:10}}>📋</div><div style={{fontFamily:"var(--F)",fontSize:22,letterSpacing:2}}>NO ENTRIES YET</div></div></div>
            : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
                {submissions.map((entry, i) => (
                  <div key={i} className="entry-card">
                    <div className="ec-hdr">
                      <div>
                        <div className="ec-name">{entry.name}</div>
                        {(entry.entryNumber||1) > 1 && <div style={{fontSize:11,color:"#5fa89e"}}>Entry {entry.entryNumber}</div>}
                      </div>
                      <div style={{fontSize:12,color:"#5fa89e"}}>#{i+1}</div>
                    </div>
                    <div style={{padding:"6px 0"}}>
                      {WC_GROUPS.map(g => {
                        const team = entry["group"+g.group]||"";
                        return (
                        <div key={g.group} style={{display:"flex",justifyContent:"space-between",padding:"4px 14px",borderBottom:"1px solid #111",fontSize:12}}>
                          <span style={{color:"#5fa89e"}}>Group {g.group}{g.multiplier>1?" ("+g.multiplier+"x)":""}</span>
                          <span style={{fontWeight:600,color:"#fff"}}>
                            <span className={isOut(team)?"elim":""}>{team||"—"}</span>
                            {team && isOut(team) && <span className="outtag">OUT</span>}
                            {team && <span style={{fontSize:10,color:"#5fa89e",marginLeft:6,fontWeight:400}}>{ownPct(team)}% owned</span>}
                          </span>
                        </div>
                        );
                      })}
                      <div style={{display:"flex",justifyContent:"space-between",padding:"6px 14px",fontSize:12,background:"rgba(0,196,180,.05)"}}>
                        <span style={{color:"#5fa89e"}}>Golden Boot</span>
                        <span style={{fontWeight:600,color:"#fff"}}>{entry.goldenBoot||"—"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {sec==="groups" && (
        <div>
          <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#5fa89e"}}><span className="m1x">1x</span> Groups 1-5</div>
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#5fa89e"}}><span className="m2x">2x DOUBLE</span> Groups 6-9</div>
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#5fa89e"}}><span className="m3x">3x TRIPLE</span> Groups 10-12</div>
          </div>
          <div className="ggrid">
            {WC_GROUPS.map(g => (
              <div key={g.group} className="gcard">
                <div className="gchdr">
                  <span className="gname">Pool Group {g.group}</span>
                  {g.multiplier===2?<span className="m2x">2x DOUBLE</span>:g.multiplier===3?<span className="m3x">3x TRIPLE</span>:<span className="m1x">1x</span>}
                </div>
                {g.teams.map(t => (
                  <div key={t} className="grow" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <span><span className={isOut(t)?"elim":""}>{t}</span>{isOut(t)&&<span className="outtag">OUT</span>}</span>
                    <span className="gown">{ownPct(t)}%</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {sec==="scoring" && (
        <div className="sgrid">
          <div className="card">
            <div className="chdr">Base Scoring</div>
            {WC_SCORING.map((s,i) => <div key={i} className="srow"><span style={{fontSize:14,color:"#ddd"}}>{s.event}</span><span className="spts">{s.pts}</span></div>)}
          </div>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="chdr">Multipliers</div>
              <div className="srow"><span style={{fontSize:14,color:"#ddd"}}>Groups 1-5</span><span className="m1x">1x standard</span></div>
              <div className="srow"><span style={{fontSize:14,color:"#ddd"}}>Groups 6-9</span><span className="m2x">2x DOUBLE</span></div>
              <div className="srow" style={{borderBottom:"none"}}><span style={{fontSize:14,color:"#ddd"}}>Groups 10-12</span><span className="m3x">3x TRIPLE</span></div>
            </div>
            <div className="card">
              <div className="chdr">Golden Boot Side Pool</div>
              <div style={{padding:"14px 16px"}}>
                {[["$5/entry","Goes into the Golden Boot pot."],["$30/entry","Goes to top 2-3 finishers."],["Split","Multiple correct picks split the pot."],["Rollover","No correct pick? Rolls into main prize pool."]].map(([k,v],i,a) => (
                  <div key={i} className="ri" style={i===a.length-1?{borderBottom:"none"}:{}}><span className="rn" style={{minWidth:64,fontSize:12,fontWeight:700}}>{k}</span><span style={{fontSize:13,color:"#ddd"}}>{v}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {sec==="fifa" && (
        <div>
          <div style={{background:"#0a1a1a",border:"2px solid #fff",borderRadius:8,padding:"16px 20px",marginBottom:16,fontSize:13,color:"#5fa89e",lineHeight:1.7}}>
            These are the official FIFA World Cup 2026 group standings. Note that FIFA groups are different from the Pool Groups used for scoring.
          </div>
          <div style={{background:"#0a1a1a",border:"2px solid #00c4b4",borderRadius:8,padding:20,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>🌍</div>
            <div style={{fontFamily:"var(--F)",fontSize:24,letterSpacing:2,color:"#00c4b4",marginBottom:8}}>FIFA GROUP STANDINGS</div>
            <div style={{fontSize:14,color:"#5fa89e",marginBottom:20}}>View the official live standings on FIFA.com.</div>
            <a href="https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026/standings" target="_blank" rel="noreferrer"
              style={{display:"inline-block",background:"#00c4b4",color:"#000",fontFamily:"var(--F)",fontSize:18,letterSpacing:2,padding:"12px 28px",borderRadius:6,textDecoration:"none",border:"2px solid #fff"}}>
              VIEW ON FIFA.COM
            </a>
            <div style={{marginTop:16,fontSize:12,color:"#5fa89e"}}>Opens official FIFA standings in a new tab</div>
          </div>
        </div>
      )}

      {sec==="goldenboot" && (
        <div>
          <div className="card">
            <div className="chdr">Live Golden Boot Race - Top Scorers</div>
            <div style={{padding:"16px 20px"}}>
              {wcScorers.length === 0 ? (
                <div style={{textAlign:"center",color:"#5fa89e",padding:"20px 0"}}>
                  <div style={{fontSize:32,marginBottom:8}}>⚽</div>
                  <div style={{fontSize:14}}>Top scorer data will appear here once goals are recorded.</div>
                </div>
              ) : (() => {
                const pickedSet = {};
                submissions.forEach(s => {
                  const gb = (s.goldenBoot||"").trim().toLowerCase();
                  if (gb) { if (!pickedSet[gb]) pickedSet[gb] = []; pickedSet[gb].push(s.name); }
                });
                const maxG = wcScorers[0]?.goals || 1;
                return wcScorers.slice(0,10).map((sc, i) => {
                  const pickers = pickedSet[sc.player.trim().toLowerCase()] || [];
                  return (
                    <div key={i} style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontFamily:"var(--F)",fontSize:18,color:i===0?"#00c4b4":"#5fa89e",minWidth:24}}>{i+1}</span>
                          <span style={{fontWeight:600,color:"#fff",fontSize:14}}>{sc.player}</span>
                          {sc.team && <span style={{fontSize:11,color:"#5fa89e"}}>{sc.team}</span>}
                          {pickers.length > 0 && <span style={{fontSize:10,color:"#00c4b4",background:"rgba(0,196,180,.12)",border:"1px solid #00c4b4",borderRadius:3,padding:"1px 6px"}}>PICKED x{pickers.length}</span>}
                        </div>
                        <span style={{fontFamily:"var(--F)",fontSize:20,color:"#00c4b4"}}>{sc.goals}</span>
                      </div>
                      <div className="lbar" style={{height:6}}>
                        <div className="lfill" style={{width:Math.round((sc.goals/maxG)*100)+"%",background:i===0?"#00c4b4":"#1a3a3a"}}/>
                      </div>
                      {pickers.length > 0 && <div style={{fontSize:11,color:"#5fa89e",marginTop:3}}>In your pool: {pickers.join(", ")}</div>}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          <div className="card">
            <div className="chdr">Pool Golden Boot Picks</div>
            <div style={{padding:"16px 20px"}}>
              <div style={{fontSize:13,color:"#5fa89e",marginBottom:20,lineHeight:1.7}}>
                $5 from each entry goes to whoever picks the tournament top scorer.
                <strong style={{color:"#fff"}}> Total pot: ${submissions.length * 5}</strong>
              </div>
              {(() => {
                const tally = {};
              submissions.forEach(s => {
                const p = s.goldenBoot || "Unknown";
                if (!tally[p]) tally[p] = [];
                tally[p].push(s.name);
              });
              const sorted = Object.entries(tally).sort((a,b) => b[1].length - a[1].length);
              const maxPicks = sorted[0]?.[1]?.length || 1;
              return sorted.map(([player, pickers], i) => (
                <div key={player} style={{marginBottom:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontWeight:600,color:"#fff",fontSize:14}}>{player}</span>
                      <span style={{fontSize:12,color:"#5fa89e"}}>{pickers.length} pick{pickers.length!==1?"s":""}</span>
                    </div>
                    <span style={{fontFamily:"var(--F)",fontSize:18,color:"#00c4b4"}}>{pickers.length}</span>
                  </div>
                  <div className="lbar" style={{height:6,marginBottom:4}}>
                    <div className="lfill" style={{width:Math.round((pickers.length/maxPicks)*100)+"%",background:i===0?"#00c4b4":"#1a3a3a"}}/>
                  </div>
                  <div style={{fontSize:11,color:"#5fa89e"}}>{pickers.join(", ")}</div>
                </div>
              ));
            })()}
            </div>
          </div>
        </div>
      )}

      {sec==="payouts" && (
        <div className="sgrid">
          <div className="card">
            <div className="chdr">Pool Payouts</div>
            <div style={{padding:"14px 16px"}}>
              <div style={{fontFamily:"var(--F)",fontSize:13,letterSpacing:1,color:"#5fa89e",marginBottom:12}}>TOTAL PRIZE POOL: $1,410</div>
              {[["1st Place","$650","#00c4b4"],["2nd Place","$375","#b0b8cc"],["3rd Place","$245","#cd7f32"],["4th Place","$140","#5fa89e"]].map(([place,amt,color],i) => (
                <div key={i} className="srow" style={i===3?{borderBottom:"none"}:{}}>
                  <span style={{fontSize:14,color:"#ddd",display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontFamily:"var(--F)",fontSize:22,color:color}}>{["1st","2nd","3rd","4th"][i]}</span>
                    {place}
                  </span>
                  <span className="spts" style={{color:color}}>{amt}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="chdr">Golden Boot Prize</div>
            <div style={{padding:"14px 16px"}}>
              <div style={{fontFamily:"var(--F)",fontSize:13,letterSpacing:1,color:"#5fa89e",marginBottom:12}}>GOLDEN BOOT POT: $235</div>
              <div className="srow"><span style={{fontSize:14,color:"#ddd"}}>Correct pick wins the pot</span><span className="spts">$235</span></div>
              <div className="srow"><span style={{fontSize:14,color:"#ddd"}}>Multiple correct picks</span><span style={{fontSize:13,color:"#5fa89e"}}>Split evenly</span></div>
              <div className="srow" style={{borderBottom:"none"}}><span style={{fontSize:14,color:"#ddd"}}>No correct pick</span><span style={{fontSize:13,color:"#5fa89e"}}>Rolls to main pool</span></div>
            </div>
          </div>
        </div>
      )}

      {sec==="rules" && (
        <div className="card">
          <div className="chdr">Pool Rules</div>
          <div style={{padding:20}}>
            <div className="rbox">
              {["Each participant chooses 1 team from each of the 12 Pool Groups, giving you 12 teams total.",
                "Pool Groups are based on DraftKings odds and FIFA rankings as of 5/18/2026 - NOT the actual FIFA World Cup groups.",
                "Groups 6, 7, 8, and 9 earn DOUBLE points on all scoring events throughout the entire tournament.",
                "Groups 10, 11, and 12 earn TRIPLE points on all scoring events throughout the entire tournament.",
                "Also select one player you think will win the Golden Boot (most goals). This is the side pool.",
                "Picks were due before 3:00 PM on June 11, 2026. Entry fee is $35.",
                "Payouts: $30 of entry goes to top 2-3 finishers; $5 goes to the Golden Boot side pool winner(s)."].map((rule,i) => (
                <div key={i} className="ri"><span className="rn">{i+1}</span><span>{rule}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HR DERBY ─────────────────────────────────────────────────────────────────
function HRDerby({allData}) {
  const [sec, setSec] = useState("standings");
  const [monthKey, setMonthKey] = useState("august");
  const [stab, setStab] = useState("season");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(null);

  const months = [{key:"august",label:"August",cur:true},{key:"july",label:"July",cur:false},{key:"june",label:"June",cur:false},{key:"may",label:"May",cur:false},{key:"april",label:"April",cur:false}];
  const cur = allData[monthKey] || allData["august"] || allData["july"] || allData["june"] || allData["may"] || {monthlyStandings:[],seasonStandings:[],rosters:[],hrLeaders:[]};
  const ms = cur.monthlyStandings || [];
  const ss = cur.seasonStandings || [];
  const ros = cur.rosters || [];
  const leaders = cur.hrLeaders || [];

  const display = stab==="season"
    ? [...ss].sort((a,b)=>b.season-a.season).map((s,i)=>({...s,rank:i+1}))
    : [...ms].sort((a,b)=>b.month-a.month).map((s,i)=>({...s,rank:i+1}));
  const maxV = display.length ? (stab==="season"?display[0].season:display[0].month)||1 : 1;
  const curMonth = months.find(m=>m.key===monthKey)||months[0];

  const filtRosters = ros.filter(r =>
    !search || r.teamName.toLowerCase().includes(search.toLowerCase()) ||
    r.players.some(p => p.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="phdr">
        <div>
          <div className="ptitle">HOME RUN DERBY POOL 2026</div>
          <div style={{fontSize:14,color:"#5fa89e",marginTop:4}}>{ros.length} teams - Live stats - Auto-updates daily</div>
        </div>
        <div className="pmeta">
          <div className="pill">Entry: <strong>50 units</strong></div>
          <div className="pill">Teams: <strong>{ros.length}</strong></div>
          <div className="pill">HR Cap: <strong>156</strong></div>
        </div>
      </div>
      <div className="stabs">
        {[{id:"standings",label:"Standings"},{id:"rosters",label:"Rosters"},{id:"leaders",label:"HR Leaders"},{id:"rules",label:"Rules"}].map(s => (
          <button key={s.id} className={"stab"+(sec===s.id?" on":"")} onClick={()=>setSec(s.id)}>{s.label}</button>
        ))}
      </div>

      {sec==="standings" && (
        <div>
          {display.length > 0 && (
            <div className="podium">
              {display.slice(0,3).map((t,i) => {
                const v = stab==="season"?t.season:t.month;
                return (
                  <div key={t.name} className={"pod p"+(i+1)}>
                    <div className="pos">{["🥇","🥈","🥉"][i]}</div>
                    <div className="pteam">{t.name}</div>
                    <div className="phr">{v}</div>
                    <div className="plbl">HOME RUNS</div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{fontSize:11,color:"#5fa89e",letterSpacing:1,textTransform:"uppercase"}}>Viewing Month:</div>
            <div className="tabs2">
              {months.map(m => <button key={m.key} className={"t2"+(monthKey===m.key?" on":"")} onClick={()=>setMonthKey(m.key)}>{m.label}{m.cur?" *":""}</button>)}
            </div>
          </div>
          <div className="tabs2">
            <button className={"t2"+(stab==="season"?" on":"")} onClick={()=>setStab("season")}>SEASON TOTAL</button>
            <button className={"t2"+(stab==="month"?" on":"")} onClick={()=>setStab("month")}>{curMonth.label.toUpperCase()} HRs</button>
          </div>
          <div className="card">
            <div className="chdr">{stab==="season"?"Season Standings":curMonth.label+" Standings"}
              {curMonth.cur && <span className="month-badge month-current">CURRENT</span>}
              {!curMonth.cur && <span className="month-badge month-past">PAST</span>}
              <span style={{marginLeft:"auto",fontSize:12,fontFamily:"var(--B)",color:"#5fa89e",fontWeight:400}}>Click team for roster</span>
            </div>
            <table>
              <thead><tr><th style={{width:48}}>Rank</th><th>Team</th><th className="r">{stab==="season"?"Season HRs":curMonth.label+" HRs"}</th><th style={{width:160}}></th></tr></thead>
              <tbody>
                {display.map(s => {
                  const v = stab==="season"?s.season:s.month;
                  const pct = Math.round((v/maxV)*100);
                  return (
                    <tr key={s.name} style={{cursor:"pointer"}} onClick={()=>{setSec("rosters");setSel(s.name);}}>
                      <td><RB rank={s.rank}/></td>
                      <td style={{fontWeight:500}}>{s.name}</td>
                      <td className="r"><span className="hn">{v}</span></td>
                      <td><div className="lbar"><div className="lfill" style={{width:pct+"%",background:s.rank===1?"#00c4b4":s.rank===2?"#b0b8cc":s.rank===3?"#cd7f32":"#00c4b4"}}/></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:"12px 16px",background:"#000",border:"2px solid #fff",borderRadius:6,fontSize:13,color:"#5fa89e"}}>
            <strong style={{color:"#00c4b4"}}>Payout:</strong> Monthly: 1st $75 - 2nd $50 | Season: 1st $300 - 2nd $175 - 3rd $75
          </div>
        </div>
      )}

      {sec==="rosters" && (
        <div>
          <div className="srch">
            <input className="si" placeholder="Search team or player..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {sel && <button className="stab on" onClick={()=>setSel(null)}>x {sel}</button>}
          </div>
          <div className="rgrid">
            {(sel?filtRosters.filter(r=>r.teamName===sel):filtRosters).map(r => (
              <div key={r.teamName} className="rc">
                <div className="rchdr">
                  <div>
                    <div className="rcname">{r.teamName}</div>
                    <div style={{fontSize:11,color:"#5fa89e",marginTop:2}}>Cap: {r.cap||"—"} - Season: {r.season} HR - {curMonth.label}: {r.month} HR</div>
                  </div>
                  <div className="rctots">
                    <div className="rcstat" style={{textAlign:"center"}}><div className="v">{r.month}</div><div className="lbl">{curMonth.label.toUpperCase()}</div></div>
                    <div className="rcstat" style={{textAlign:"center"}}><div className="v" style={{color:"#00e5d4"}}>{r.season}</div><div className="lbl">SEASON</div></div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",padding:"6px 16px 4px",borderBottom:"1px solid #111"}}>
                  <span style={{fontSize:10,color:"#5fa89e",letterSpacing:1,textTransform:"uppercase"}}>Player</span>
                  <span style={{fontSize:10,color:"#5fa89e",textAlign:"right",minWidth:36}}>Cap</span>
                  <span style={{fontSize:10,color:"#5fa89e",textAlign:"right",minWidth:40,paddingLeft:10}}>{curMonth.label}</span>
                  <span style={{fontSize:10,color:"#5fa89e",textAlign:"right",minWidth:44,paddingLeft:10}}>Season</span>
                </div>
                {r.players.map((p,i) => (
                  <div key={i} className="rpr" style={(p.swap||p.out)?{opacity:.65,background:p.out?"rgba(232,69,69,.05)":"rgba(0,196,180,.03)"}:{}}>
                    <div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:13,fontWeight:(p.swap||p.out)?400:500}}>{p.name}</span>
                      {p.swap && <span className="swapb">SWAP</span>}
                      {p.out && <span className="outb">OUT</span>}
                    </div>
                    <span style={{fontSize:11,color:"#5fa89e",textAlign:"right",minWidth:36}}>{p.cap2025}</span>
                    <span style={{fontFamily:"var(--F)",fontSize:14,color:"#00c4b4",textAlign:"right",minWidth:40,paddingLeft:10}}>{p.month!=null?p.month:"—"}</span>
                    <span style={{fontFamily:"var(--F)",fontSize:14,color:"#00e5d4",textAlign:"right",minWidth:44,paddingLeft:10}}>{p.season!=null?p.season:"—"}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {sec==="leaders" && (
        <div className="card">
          <div className="chdr">2026 MLB HR Leaders</div>
          <table>
            <thead><tr><th style={{width:48}}>Rank</th><th>Player</th><th>Team</th><th className="r">HRs</th></tr></thead>
            <tbody>
              {leaders.slice(0,40).map((p,i) => (
                <tr key={i}>
                  <td><RB rank={p.rank}/></td>
                  <td style={{fontWeight:500}}>{p.name}</td>
                  <td><span className="ttag">{p.team}</span></td>
                  <td className="r"><span className="hn">{p.hr}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sec==="rules" && (
        <div className="card">
          <div className="chdr">Rules and Payouts</div>
          <div style={{padding:20}}>
            <div className="rbox">
              {["Draft 7 players from the player pool. Combined 2025 HR total cannot exceed 156.",
                "Designate an 8th SWAP player. Can replace one roster player before the All-Star Game.",
                "Once a swap is made, no further changes are allowed.",
                "Scoring is cumulative season-long HRs.",
                "October regular season games count. Play-in games do NOT.",
                "No free agent or IR moves beyond the one allowed swap.",
                "Monthly prizes for Top 2 teams (April through September). Monthly totals are NOT cumulative.",
                "End-of-year prizes for Top 3 teams."].map((rule,i) => (
                <div key={i} className="ri"><span className="rn">{i+1}</span><span>{rule}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function NFLCountdownMini() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = NFL_DEADLINE - now;
  if (diff <= 0) return null;
  const d = Math.floor(diff/86400000), h = Math.floor(diff/3600000)%24;
  const m = Math.floor(diff/60000)%60, s = Math.floor(diff/1000)%60;
  const cell = (v,l) => (
    <div key={l} style={{textAlign:"center"}}>
      <div style={{fontFamily:"var(--F)",fontSize:20,color:"#ffd700",lineHeight:1}}>{String(v).padStart(2,"0")}</div>
      <div style={{fontSize:9,color:"#5fa89e",letterSpacing:1}}>{l}</div>
    </div>
  );
  return (
    <div style={{display:"flex",gap:12,justifyContent:"flex-start",marginTop:2}}>
      {cell(d,"DAYS")}{cell(h,"HRS")}{cell(m,"MIN")}{cell(s,"SEC")}
    </div>
  );
}

function Dashboard({setTab, allData, updatedAt, submissions, wcScores}) {
  const [showNflRules, setShowNflRules] = useState(false);
  const [nflEntryCount, setNflEntryCount] = useState(null);

  useEffect(() => {
    if (!NFL_ENTRIES_CSV_URL) return;
    fetch(NFL_ENTRIES_CSV_URL).then(r => r.text()).then(t => {
      setNflEntryCount(parseNflEntriesCSV(t).length);
    }).catch(() => {}); // quietly stay blank if it fails -- not worth blocking the dashboard over
  }, []);
  const cur = allData["august"] || allData["july"] || allData["june"] || allData["may"] || {seasonStandings:[],monthlyStandings:[]};
  const ss = cur.seasonStandings || [];
  const ms = cur.monthlyStandings || [];
  const sl = [...ss].sort((a,b)=>b.season-a.season)[0] || {};
  const ml = [...ms].sort((a,b)=>b.month-a.month)[0] || {};
  const isLocked = new Date() >= DEADLINE;

  const topWC = submissions.map(entry => {
    const {total} = calcScore(entry, wcScores);
    return {...entry, total};
  }).sort((a,b) => b.total - a.total).slice(0,5);

  return (
    <div>
      <div style={{marginBottom:28,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
        <div>
          <div style={{fontFamily:"var(--F)",fontSize:36,letterSpacing:3,marginBottom:6}}>ACTIVE POOLS</div>
          <div className="updated"><span className="live-dot"/>Live data - Updated {updatedAt}</div>
        </div>
        <img src="/wugderby-logo.png" alt="Wug Derby Pools" style={{height:96,width:"auto",opacity:0.96,flexShrink:0}}/>
      </div>
      <div className="dgrid">
        <div className="dc" onClick={()=>setTab("hr")}>
          <div className="dctop">
            <div className="dico">⚾</div>
            <div><div className="dctitle">Home Run Derby</div><div className="dcsub">2026 MLB Season - {ss.length} Teams</div></div>
            <span className="blive" style={{marginLeft:"auto"}}>LIVE</span>
          </div>
          <div className="dcbody">
            <div className="dsr"><span className="dsl">Season Leader</span><span className="dsv">{sl.name||"—"} ({sl.season||0} HR)</span></div>
            <div className="dsr"><span className="dsl">August Leader</span><span className="dsv">{ml.name||"—"} ({ml.month||0} HR)</span></div>
            <div className="dsr" style={{marginBottom:0}}><span className="dsl">Season Prize</span><span className="dsv">1st $300 - 2nd $175 - 3rd $75</span></div>
          </div>
          <button className="dcta">VIEW STANDINGS</button>
        </div>
        <div className="dc" onClick={()=>setTab("nfl")}>
          <div className="dctop">
            <div className="dico">🏈</div>
            <div><div className="dctitle">NFL Derby Pool</div><div className="dcsub">2026 NFL Season{nflEntryCount !== null ? ` - ${nflEntryCount} ${nflEntryCount === 1 ? "Team" : "Teams"} Entered` : ""}</div></div>
            <span className={new Date()>=NFL_DEADLINE?"blive":"bsoon"} style={{marginLeft:"auto"}}>{new Date()>=NFL_DEADLINE?"LIVE":"OPEN"}</span>
          </div>
          <div className="dcbody">
            <div className="dsr"><span className="dsl">Entry</span><span className="dsv">$50</span></div>
            <div className="dsr"><span className="dsl">Picks Due</span><span className="dsv">Sep 9, 2026 - 8:00 PM ET</span></div>
            {new Date() < NFL_DEADLINE && <NFLCountdownMini/>}
            <div className="dsr" style={{marginBottom:8}}>
              <span
                onClick={(e) => { e.stopPropagation(); setShowNflRules(v => !v); }}
                style={{color:"#00c4b4",fontSize:12,textDecoration:"underline",cursor:"pointer"}}
              >
                {showNflRules ? "Hide Rules ▴" : "View Abbreviated Rules ▾"}
              </span>
            </div>
            {showNflRules && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{background:"#000",border:"1px solid #1a3a3a",borderRadius:6,padding:"10px 12px",marginBottom:8,fontSize:12,color:"#8fc9c0",lineHeight:1.7}}
              >
                <div><strong style={{color:"#ffd700"}}>Roster:</strong> 2 Team QBs, 2 Team Kickers, 6 skill players, 1 Swap Player</div>
                <div><strong style={{color:"#ffd700"}}>Cap:</strong> 146 total (salaries from 2025 stats)</div>
                <div><strong style={{color:"#ffd700"}}>Swap:</strong> One swap allowed before Week 9; can't exceed the cap; QB/K can't be swapped</div>
                <div><strong style={{color:"#ffd700"}}>Scoring:</strong> Rush/Rec/Pass TD = 6 pts, FG = 3 pts, XP = 0</div>
                <div><strong style={{color:"#ffd700"}}>Pay Periods:</strong> Wks 1-4, 5-8, 9-13, 14-18, + Overall</div>
                <div><strong style={{color:"#ffd700"}}>Entry:</strong> $50, due by Week 2</div>
                <div><strong style={{color:"#ffd700"}}>Payment:</strong> Zelle - scott.wbeverly@gmail.com</div>
              </div>
            )}
            <div className="dsr" style={{marginBottom:0}}><span className="dsl">Status</span><span className="dsv" style={{color:"#00c4b4"}}>{new Date()>=NFL_DEADLINE?"Season Live":"Submissions Open"}</span></div>
          </div>
          <button className="dcta">{new Date()>=NFL_DEADLINE?"VIEW POOL":"SUBMIT YOUR PICKS"}</button>
        </div>
      </div>
      <div className="card">
        <div className="chdr">HR Derby - Season Top 5</div>
        <table>
          <thead><tr><th>Rank</th><th>Team</th><th className="r">Season HRs</th><th className="r">July HRs</th></tr></thead>
          <tbody>
            {[...ss].sort((a,b)=>b.season-a.season).slice(0,5).map((s,i) => {
              const m = ms.find(x=>x.name===s.name);
              return (
                <tr key={s.name}>
                  <td><RB rank={i+1}/></td>
                  <td style={{fontWeight:500}}>{s.name}</td>
                  <td className="r"><span className="hn">{s.season}</span></td>
                  <td className="r"><span className="hns">{m?m.month:"—"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:32,marginBottom:12}}>
        <div style={{fontFamily:"var(--F)",fontSize:22,letterSpacing:2,color:"#5fa89e",marginBottom:12,borderBottom:"1px solid #1a3a3a",paddingBottom:8}}>PAST POOLS</div>
        <div className="dc" style={{opacity:0.8,cursor:"pointer"}} onClick={()=>setTab("wc")}>
          <div className="dctop">
            <div className="dico">⚽</div>
            <div><div className="dctitle">World Cup Pool</div><div className="dcsub">FIFA World Cup 2026 - Final Results</div></div>
            <span style={{marginLeft:"auto",background:"rgba(255,215,0,.12)",color:"#ffd700",border:"1px solid #ffd700",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700,letterSpacing:1}}>FINAL</span>
          </div>
          <div className="dcbody">
            <div className="dsr"><span className="dsl">Champion</span><span className="dsv" style={{color:"#ffd700"}}>Spain</span></div>
            <div className="dsr"><span className="dsl">Entries</span><span className="dsv">{submissions.length} participants</span></div>
            <div className="dsr" style={{marginBottom:0}}><span className="dsl">Status</span><span className="dsv" style={{color:"#5fa89e"}}>Tournament Complete</span></div>
          </div>
          <button className="dcta">VIEW RESULTS</button>
        </div>
      </div>
      <div className="card">
          <div className="chdr">World Cup Pool - Final Top 5</div>
          <table>
            <thead><tr><th>Rank</th><th>Participant</th><th className="r">Points</th></tr></thead>
            <tbody>
              {topWC.map((e,i) => (
                <tr key={i}>
                  <td><RB rank={i+1}/></td>
                  <td style={{fontWeight:500}}>{e.name}{(e.entryNumber||1)>1&&<span style={{fontSize:11,color:"#5fa89e",marginLeft:8}}>Entry {e.entryNumber}</span>}</td>
                  <td className="r"><span className="hn">{e.total}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </div>
  );
}

// ── JULY 4TH FIREWORKS ────────────────────────────────────────────────────────
function isJuly4() {
  const d = new Date();
  return d.getMonth() === 6 && d.getDate() === 4;
}

function Fireworks() {
  const ref = (node) => { if (node) startFireworks(node); };
  return <canvas ref={ref} style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",pointerEvents:"none",zIndex:9999}}/>;
}

function startFireworks(canvas) {
  if (canvas._started) return;
  canvas._started = true;
  const ctx = canvas.getContext("2d");
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
  window.addEventListener("resize", onResize);
  const COLORS = ["#e84545","#ffffff","#3b6cff","#00c4b4","#ffd700"];
  const particles = [];
  const rockets = [];
  function launch() {
    rockets.push({x:Math.random()*W,y:H,tx:W*0.2+Math.random()*W*0.6,ty:H*0.15+Math.random()*H*0.35,vy:-(8+Math.random()*3),color:COLORS[Math.floor(Math.random()*COLORS.length)]});
  }
  function burst(x,y,color) {
    const n = 60 + Math.floor(Math.random()*40);
    for (let i=0;i<n;i++){
      const ang = (Math.PI*2*i)/n;
      const spd = 1.5 + Math.random()*4;
      particles.push({x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,life:1,color:Math.random()<0.3?"#ffffff":color,size:1.5+Math.random()*1.5});
    }
  }
  let frame = 0;
  let raf;
  function tick(){
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0,0,W,H);
    frame++;
    if (frame % 32 === 0) launch();
    for (let i=rockets.length-1;i>=0;i--){
      const r = rockets[i];
      r.x += (r.tx-r.x)*0.02;
      r.y += r.vy;
      r.vy += 0.06;
      ctx.beginPath();
      ctx.arc(r.x,r.y,2.2,0,Math.PI*2);
      ctx.fillStyle = r.color;
      ctx.fill();
      if (r.y <= r.ty || r.vy >= 0){ burst(r.x,r.y,r.color); rockets.splice(i,1); }
    }
    for (let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.045; p.vx *= 0.99; p.life -= 0.012;
      if (p.life <= 0){ particles.splice(i,1); continue; }
      ctx.globalAlpha = Math.max(p.life,0);
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(tick);
  }
  tick();
  // Auto-stop after 20 seconds to keep it tasteful and free resources
  setTimeout(() => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); ctx.clearRect(0,0,W,H); canvas.style.display="none"; }, 20000);
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [allData, setAllData] = useState({});
  const [updatedAt, setUpdatedAt] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [wcScores, setWcScores] = useState({});
  const [wcScorers, setWcScorers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchWithTimeout(AUGUST_CSV_URL).then(r=>r.text()),
      fetchWithTimeout(JULY_CSV_URL).then(r=>r.text()),
      fetchWithTimeout(JUNE_CSV_URL).then(r=>r.text()),
      fetchWithTimeout(MAY_CSV_URL).then(r=>r.text()),
      fetchWithTimeout(APRIL_CSV_URL).then(r=>r.text()),
      fetchWithTimeout(SUBS_CSV_URL).then(r=>r.text()),
      fetchWithTimeout(SCORES_CSV_URL).then(r=>r.text()),
      fetchWithTimeout(SCORERS_CSV_URL).then(r=>r.text()),
    ]).then(([august, july, june, may, april, subs, scores, scorers]) => {
      setAllData({ august: parseCSV(august), july: parseCSV(july), june: parseCSV(june), may: parseCSV(may), april: parseCSV(april) });
      setSubmissions(parseSubmissions(subs));
      setWcScores(parseScores(scores));
      setWcScorers(parseScorers(scorers));
      setUpdatedAt(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
      setLoading(false);
    }).catch(() => { setError("Taking longer than expected to load. Check your connection and tap below to try again."); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return (<><style>{S}</style><div className="loading"><div style={{fontSize:40}}>⚠️</div><div style={{textAlign:"center",padding:"0 24px"}}>{error}</div><button className="submit-btn" style={{maxWidth:220,marginTop:8}} onClick={() => window.location.reload()}>TRY AGAIN</button></div></>);
  if (loading) return (<><style>{S}</style><div className="loading"><div className="spinner"/><div style={{fontFamily:"var(--F)",fontSize:24,letterSpacing:2}}>LOADING LIVE DATA...</div></div></>);

  return (
    <>
      <style>{S}</style>
      {isJuly4() && <Fireworks/>}
      <div>
        <header className="hdr">
          <div className="logo" style={{cursor:"pointer"}} onClick={()=>setTab("dashboard")}>WUG DERBY<span> POOLS</span></div>
          <div style={{fontSize:13,color:"#5fa89e"}}>{isJuly4()?<span style={{color:"#e84545",fontWeight:700}}>HAPPY 4TH OF JULY</span>:<span style={{color:"#00e5d4",fontWeight:700}}>HR DERBY LIVE</span>}</div>
        </header>
        <nav className="nav">
          {[{id:"dashboard",label:"Dashboard"},{id:"hr",label:"HR Derby"},{id:"nfl",label:"NFL Derby"},{id:"wc",label:"World Cup"}].map(t=>(
            <button key={t.id} className={"ntab"+(tab===t.id?" on":"")} onClick={()=>setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
        <main className="main">
          {isJuly4() && (
            <div className="july4-banner">
              <div className="july4-inner">
                <span className="july4-star">⭐</span>
                <div>
                  <div className="july4-title">HAPPY 4TH OF JULY</div>
                  <div className="july4-sub">Celebrating in the USA - host of World Cup 2026</div>
                </div>
                <span className="july4-star">⭐</span>
              </div>
            </div>
          )}
          {tab==="dashboard" && <Dashboard setTab={setTab} allData={allData} updatedAt={updatedAt} submissions={submissions} wcScores={wcScores}/>}
          {tab==="hr" && <HRDerby allData={allData}/>}
          {tab==="wc" && <WorldCup submissions={submissions} wcScores={wcScores} wcScorers={wcScorers}/>}
          {tab==="nfl" && (new Date() < NFL_DEADLINE ? <NFLEntryForm/> : <NFLStandings/>)}
        </main>
      </div>
    </>
  );
}
