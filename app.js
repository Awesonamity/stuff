// === Tabs ===
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).style.display = '';
  };
});

// === YouTube API Key ===
const API_KEY = "AIzaSyBjLRXyDPkszZ15yW0Pzrck3x3GFxC3z5k";

// === Helper functions ===
function extractChannelId(input) {
  try {
    let url = new URL(input);
    let parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel") return parts[1];
    if (parts[0] === "user") return parts[1];
    if (parts[0] === "c") return parts[1];
  } catch {}
  return input;
}
function extractVideoId(url) {
  try {
    let u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    return new URLSearchParams(u.search).get("v");
  } catch { return null; }
}

// === Compare Tab ===
async function compareSubs() {
  let a = document.getElementById('compareA').value.trim();
  let b = document.getElementById('compareB').value.trim();
  let div = document.getElementById('compareResult');
  div.innerHTML = "Loading...";
  let [ca, cb] = await Promise.all([fetchChannel(a), fetchChannel(b)]);
  if (!ca && !cb) return div.innerHTML = "<span style='color:#f66'>Neither channel found.</span>";
  div.innerHTML = '';
  if (ca) div.innerHTML += channelCard(ca);
  if (cb) div.innerHTML += channelCard(cb);
  if (ca && cb) {
    let winner = +ca.statistics.subscriberCount > +cb.statistics.subscriberCount ? ca : cb;
    div.innerHTML += `<div style="margin:1em 0"><b>Winner: ${winner.snippet.title}</b></div>`;
  }
}
function channelCard(info) {
  return `<div class="channel-card">
    <img src="${info.snippet.thumbnails.default.url}" alt="">
    <div>
      <b>${info.snippet.title}</b><br>
      Subs: ${info.statistics.hiddenSubscriberCount ? "Hidden" : (+info.statistics.subscriberCount).toLocaleString()}
    </div>
  </div>`;
}
async function fetchChannel(input) {
  let id = extractChannelId(input);
  let url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${id}&key=${API_KEY}`;
  let r = await fetch(url); let d = await r.json();
  let c = d.items && d.items[0];
  if (!c) {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${id}&key=${API_KEY}`;
    r = await fetch(url); d = await r.json();
    c = d.items && d.items[0];
  }
  return c || null;
}

// === Video Info Tab ===
async function fetchVideo() {
  let url = document.getElementById('videoUrl').value.trim();
  let vid = extractVideoId(url);
  let div = document.getElementById('videoInfo');
  if (!vid) return div.innerHTML = "<span style='color:#f66'>Invalid YouTube video URL.</span>";
  let api = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${vid}&key=${API_KEY}`;
  let resp = await fetch(api);
  let data = await resp.json();
  let item = data.items && data.items[0];
  if (!item) return div.innerHTML = "<span style='color:#f66'>Video not found.</span>";
  div.innerHTML = `<div class="video-card">
    <img src="${item.snippet.thumbnails.default.url}" alt="">
    <div>
      <b>${item.snippet.title}</b><br>
      Views: ${(+item.statistics.viewCount).toLocaleString()}
    </div>
  </div>`;
}

// === Sub Race Tab ===
function randomString(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let arr = Array(len).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]);
  return arr.join('');
}
function createRace() {
  let key = randomString(1000);
  window.location.hash = key;
  setupRace();
}
function getRaceKey() {
  return window.location.hash.replace(/^#/, "");
}
function setupRace() {
  let key = getRaceKey();
  if (key.length !== 1000) {
    document.getElementById('raceSetup').style.display = '';
    document.getElementById('raceArea').style.display = 'none';
    return;
  }
  document.getElementById('raceSetup').style.display = 'none';
  document.getElementById('raceArea').style.display = '';
  document.getElementById('raceLink').innerHTML = `<b>Race Link:</b> <input value="${window.location.href}" readonly style="width:70%;">`;
  loadRaceChannels();
}
function loadRaceChannels() {
  let key = getRaceKey();
  let raceChannels = JSON.parse(localStorage.getItem("race_" + key) || "[]");
  renderRaceChannels(raceChannels);
}
function renderRaceChannels(list) {
  let div = document.getElementById('raceChannels');
  div.innerHTML = '';
  if (!list.length) {
    div.innerHTML = '<small>No channels yet. Add one!</small>';
    document.getElementById('raceResults').innerHTML = '';
    return;
  }
  div.innerHTML = '<b>Channels in Race:</b><br>';
  list.forEach((c, i) => {
    div.innerHTML += `<div class="race-card"><span>${c}</span> <button onclick="removeRaceChannel(${i})">Remove</button></div>`;
  });
  updateRaceResults(list);
}
async function updateRaceResults(list) {
  let div = document.getElementById('raceResults');
  div.innerHTML = 'Loading...';
  let infos = await Promise.all(list.map(fetchChannel));
  let valid = infos.filter(Boolean);
  if (!valid.length) return div.innerHTML = '<span style="color:#f66">No valid channels yet.</span>';
  valid.sort((a, b) => (+b.statistics.subscriberCount || 0) - (+a.statistics.subscriberCount || 0));
  div.innerHTML = '<b>Leaderboard</b>';
  valid.forEach((info, i) => {
    div.innerHTML += `<div class="race-card"><img src="${info.snippet.thumbnails.default.url}"><b>${info.snippet.title}</b> - Subs: ${info.statistics.hiddenSubscriberCount ? "Hidden" : (+info.statistics.subscriberCount).toLocaleString()}</div>`;
  });
}
function addRaceChannel() {
  let key = getRaceKey();
  let input = document.getElementById('raceChannelInput');
  let val = input.value.trim();
  if (!val) return;
  let list = JSON.parse(localStorage.getItem("race_" + key) || "[]");
  if (!list.includes(val)) list.push(val);
  localStorage.setItem("race_" + key, JSON.stringify(list));
  input.value = '';
  renderRaceChannels(list);
}
function removeRaceChannel(idx) {
  let key = getRaceKey();
  let list = JSON.parse(localStorage.getItem("race_" + key) || "[]");
  list.splice(idx, 1);
  localStorage.setItem("race_" + key, JSON.stringify(list));
  renderRaceChannels(list);
}
// On load, check for race
window.onload = () => { if (window.location.hash) setupRace(); }
window.onhashchange = () => { setupRace(); }
