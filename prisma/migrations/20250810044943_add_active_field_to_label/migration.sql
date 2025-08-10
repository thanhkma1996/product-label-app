/*
  Warnings:

  - You are about to alter the column `productIds` on the `Label` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Label" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "productIds" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Label" ("background", "condition", "createdAt", "id", "position", "productIds", "text", "updatedAt") SELECT "background", "condition", "createdAt", "id", "position", "productIds", "text", "updatedAt" FROM "Label";
DROP TABLE "Label";
ALTER TABLE "new_Label" RENAME TO "Label";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
