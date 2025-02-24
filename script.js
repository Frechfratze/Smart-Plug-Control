/*******************************************
 * ACHTUNG:
 * Die folgenden Daten sind offensichtlich
 * NICHT sicher hier im Code.
 *******************************************/
const TAPO_EMAIL = "deine-tapo-mail@beispiel.de";
const TAPO_PASSWORD = "dein-tapo-passwort";
const TAPO_DEVICE_ID = "1234567890ABCDEF1234567890ABCDEF"; // Aus Device-Liste rauslesen

// Minimaler Hardcoded-Zugang
const VALID_USERNAME = "RowdyRoosters";
const VALID_PASSWORD = "Fifi";

let tapoToken = null; // wird gespeichert, wenn wir uns "einloggen"

document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('login-section');
  const controlSection = document.getElementById('control-section');

  const loginButton = document.getElementById('login-button');
  loginButton.addEventListener('click', async () => {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (user === VALID_USERNAME && pass === VALID_PASSWORD) {
      // Login OK - UI umschalten
      loginSection.style.display = 'none';
      controlSection.style.display = 'block';

      // Versuche, dich bei der Tapo-Cloud einzuloggen und Token zu holen
      try {
        tapoToken = await tapoCloudLogin(TAPO_EMAIL, TAPO_PASSWORD);
        console.log("Tapo Cloud Token:", tapoToken);
        // Optional: Status abfragen
        updatePlugStatus();
      } catch (err) {
        alert("Konnte Tapo-Token nicht holen. (CORS oder falsche Daten?)");
      }

    } else {
      alert("Falscher Benutzername oder Passwort!");
    }
  });

  // Button-Events
  document.getElementById('start-button').addEventListener('click', async () => {
    if (!tapoToken) return alert("Keine Verbindung zur Tapo Cloud.");
    // Plug einschalten
    await tapoSetDeviceState(tapoToken, TAPO_DEVICE_ID, true);
    updatePlugStatus();
  });

  document.getElementById('stop-button').addEventListener('click', async () => {
    if (!tapoToken) return alert("Keine Verbindung zur Tapo Cloud.");
    // Plug ausschalten
    await tapoSetDeviceState(tapoToken, TAPO_DEVICE_ID, false);
    updatePlugStatus();
  });

  document.getElementById('restart-button').addEventListener('click', async () => {
    if (!tapoToken) return alert("Keine Verbindung zur Tapo Cloud.");
    // Ausschalten
    await tapoSetDeviceState(tapoToken, TAPO_DEVICE_ID, false);
    // Warte z.B. 5 Sekunden, dann wieder einschalten
    setTimeout(async () => {
      await tapoSetDeviceState(tapoToken, TAPO_DEVICE_ID, true);
      updatePlugStatus();
    }, 5000);
  });
});


/**
 * (Pseudo-Funktion) Fragt ab, ob Plug online/offline ist
 */
async function updatePlugStatus() {
  const plugStatusEl = document.getElementById('plug-status');
  if (!tapoToken) {
    plugStatusEl.innerText = "Keine Verbindung";
    return;
  }
  try {
    // Hole Liste aller Geräte
    const devices = await tapoGetDeviceList(tapoToken);
    // Finde unser P110
    const myPlug = devices.find(d => d.deviceId === TAPO_DEVICE_ID);
    if (!myPlug) {
      plugStatusEl.innerText = "Unbekannt (Plug nicht in Liste)";
      return;
    }

    // myPlug.status = 1 oder 0 oder "online"/"offline" je nach Cloud
    plugStatusEl.innerText = myPlug.status === 1 ? "Online (An)" : "Offline (Aus)";
  } catch (err) {
    console.error(err);
    plugStatusEl.innerText = "Fehler beim Statusholen";
  }
}

// Unten die Tapo-Methoden (siehe vorherige Beispiele) 
async function tapoCloudLogin(email, password) {
  const url = 'https://eu-wap.tplinkcloud.com'; // ggf. anpassen
  const loginPayload = {
    method: "login",
    params: {
      appType: "Tapo_Android",
      cloudPassword: password,
      cloudUserName: email,
      terminalUUID: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(loginPayload)
  });
  if (!response.ok) {
    throw new Error('Tapo Login Fehler (CORS)');
  }
  const data = await response.json();
  if (!data.result || !data.result.token) {
    throw new Error('Kein Token erhalten');
  }
  return data.result.token;
}

async function tapoGetDeviceList(token) {
  const url = `https://eu-wap.tplinkcloud.com?token=${token}`;
  const payload = { method: "getDeviceList" };
  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  return data.result.deviceList || [];
}

async function tapoSetDeviceState(token, deviceId, isOn) {
  const url = `https://eu-wap.tplinkcloud.com?token=${token}`;
  const payload = {
    method: "passthrough",
    params: {
      deviceId: deviceId,
      requestData: JSON.stringify({
        system: {
          set_relay_state: { state: isOn ? 1 : 0 }
        }
      })
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  return data;
}

