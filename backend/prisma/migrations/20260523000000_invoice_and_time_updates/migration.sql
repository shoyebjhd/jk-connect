-- AlterTable: remove projectId, add clientId, rename date fields
ALTER TABLE `Invoice` DROP FOREIGN KEY `Invoice_projectId_fkey`;
ALTER TABLE `Invoice` DROP INDEX `Invoice_projectId_fkey`;
ALTER TABLE `Invoice` DROP COLUMN `projectId`;
ALTER TABLE `Invoice` DROP COLUMN `weekStartDate`;
ALTER TABLE `Invoice` DROP COLUMN `weekEndDate`;
ALTER TABLE `Invoice` ADD COLUMN `clientId` INTEGER NOT NULL;
ALTER TABLE `Invoice` ADD COLUMN `startDate` DATETIME(3) NULL;
ALTER TABLE `Invoice` ADD COLUMN `endDate` DATETIME(3) NULL;
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
