import PocketBase, { RecordService } from "pocketbase";
import { devMode, formatTime } from "./main";
const url = "https://asteroids.pockethost.io";
export const pb = new PocketBase(url);

export var user, signedIn = false;

// pb.authStore.clear();

if (pb.authStore.model) {
  user = pb.authStore.model;
  signedIn = true;
}

/*
pb.collection("feed").subscribe("*", async (event) => {
  const record = await pb.collection("feed").getOne(event.record.id, {
    expand: "user"
  })

  console.log(record)
  new Notify({
    title: record.expand.user.name + " died in " + formatTime(record.data.time) + " with a score of " + record.data.score,
  })
})
*/

export async function postScore(score, time, dev, version) {
  return await pb.collection("scores").create({
    user: user.id,
    score,
    time,
    dev,
    version
  });
}

export async function updateStats({ score, level, kills }) {
  return await pb.collection("users").update(user.id, {
    deaths: (user.deaths || 0) + 1,
    score: (user.score || 0) + score,
    levelups: (user.levelups || 0) + level,
    kills: (user.kills || 0) + kills
  });
}

export async function postFeed(event) {
  return await pb.collection("feed").create({
    user: user.id,
    data: event.data,
    type: event.type,
    dev: event.dev
  });
}

export async function getUsers() {
  return await pb.collection("users").getFullList({});
}

export async function getScores() {
  let scores = (await pb.collection("scores").getFullList({ expand: "user" })).filter(e => (!e.dev) || devMode);
  return scores;
}

export async function signIn() {
  let username = await getUsername("Enter a username");
  if (!username) return;
  let users = await getUsers();
  if (users.map(e => e.username).includes(username)) {
    let password = await getPassword("Enter your password");
    if (!password) return;
    try {
      let authData = await pb.collection('users').authWithPassword(username, password);
      console.log(authData);
      user = authData.record;
      signedIn = true;
      return authData;
    } catch (err) {
      console.error(err);
      return;
    }
  } else {
    let password = await getPassword("Create a password");
    if (!password) return;
    user = await pb.collection('users').create({ username, password, name: username, passwordConfirm: password });
    try {
      let authData = await pb.collection('users').authWithPassword(username, password);
      console.log(authData);
      user = authData.record;
      signedIn = true;
      return authData;
    } catch (err) {
      console.error(err);
      return;
    }
  }
}

export async function signInWithGoogle() {
  const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' });
}

export async function getUsername(prompt) {
  let dialog = document.getElementById("username");
  dialog.showModal();
  dialog.querySelector(".prompt").innerText = prompt;
  return new Promise((res, rej) => {
    dialog.querySelector(".prompt").addEventListener("keypress", (ev) => {
      if (ev.key !== "Enter") return;
      let username = ev.currentTarget.value.toLowerCase();
      res(username);
      dialog.close();
    });
    dialog.querySelector("button").addEventListener("click", () => {
      let username = dialog.querySelector(".prompt").value.toLowerCase();
      res(username);
      dialog.close();
    });
  });
}

export async function getPassword(prompt) {
  let dialog = document.getElementById("password");
  dialog.showModal();
  dialog.querySelector(".prompt").innerText = prompt;
  return new Promise((res, rej) => {
    dialog.querySelector(".prompt").addEventListener("keypress", (ev) => {
      if (ev.key !== "Enter") return;
      let password = ev.currentTarget.value;
      res(password);
      dialog.close();
    });
    dialog.querySelector("button").addEventListener("click", () => {
      let password = dialog.querySelector(".prompt").value;
      res(password);
      dialog.close();
    });
  });
}

export function signOut() {
  pb.authStore.clear();
  signedIn = false;
  user = null;
}