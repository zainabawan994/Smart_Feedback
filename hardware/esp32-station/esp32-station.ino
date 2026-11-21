// SmartFeedback station: three buttons (Loved it / Okay / Not great) that log a feeling to the owner desk.
// Board: any ESP32 dev board (Arduino IDE: install "esp32" by Espressif in Boards Manager). No extra libraries.
// Wiring: each button between its pin and GND (internal pull-ups are used). LED: built-in on GPIO 2.
// Fill in the values below; SERVER_URL, SLUG and STATION_KEY are on the owner desk → QR & table card page.

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "your-wifi";
const char* WIFI_PASS = "your-wifi-password";
const char* SERVER_URL = "https://your-app.vercel.app/api/station";
const char* SLUG = "chai-khana";
const char* STATION_KEY = "paste-from-qr-page";

const int PINS[3] = {25, 26, 27};  // Loved it, Okay, Not great
const char* FEELINGS[3] = {"positive", "neutral", "negative"};
const int LED = 2;
const unsigned long COOLDOWN_MS = 3000;  // one press per guest, not a stream of taps

unsigned long lastPress = 0;

void blink(int times, int ms) {
  for (int i = 0; i < times; i++) { digitalWrite(LED, HIGH); delay(ms); digitalWrite(LED, LOW); delay(ms); }
}

void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) { digitalWrite(LED, i % 2); delay(250); }
  digitalWrite(LED, LOW);
}

bool send(const char* feeling) {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClientSecure client;
  // shortcut: skips the HTTPS certificate check (someone on the same network could read the key); set client.setCACert(...) with your host's root CA for a real install.
  client.setInsecure();
  HTTPClient http;
  if (!http.begin(client, SERVER_URL)) return false;
  http.addHeader("Content-Type", "application/json");
  String body = String("{\"slug\":\"") + SLUG + "\",\"key\":\"" + STATION_KEY + "\",\"sentiment\":\"" + feeling + "\"}";
  int code = http.POST(body);
  http.end();
  return code == 200;
}

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  for (int p : PINS) pinMode(p, INPUT_PULLUP);
  connectWifi();
  Serial.println(WiFi.status() == WL_CONNECTED ? "WiFi connected" : "WiFi failed, will retry on press");
}

void loop() {
  for (int i = 0; i < 3; i++) {
    if (digitalRead(PINS[i]) == LOW && millis() - lastPress > COOLDOWN_MS) {
      lastPress = millis();
      delay(30);  // debounce
      bool ok = send(FEELINGS[i]);
      Serial.printf("%s -> %s\n", FEELINGS[i], ok ? "saved" : "failed");
      ok ? blink(1, 600) : blink(5, 80);  // long blink = thank you, fast blinks = not sent
    }
  }
  delay(10);
}
