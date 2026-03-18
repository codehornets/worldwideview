-- CreateTable
CREATE TABLE "aviation_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "icao24" TEXT NOT NULL,
    "callsign" TEXT,
    "timestamp" DATETIME NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "altitude" REAL,
    "speed" REAL,
    "heading" REAL
);

-- CreateTable
CREATE TABLE "installed_plugins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pluginId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "aviation_history_timestamp_idx" ON "aviation_history"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "aviation_history_timestamp_icao24_key" ON "aviation_history"("timestamp", "icao24");
