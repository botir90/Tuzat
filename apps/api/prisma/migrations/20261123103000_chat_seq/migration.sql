-- Strict order of chat messages (several can share the same createdAt).
ALTER TABLE "ChatMessage" ADD COLUMN "seq" SERIAL NOT NULL;
CREATE UNIQUE INDEX "ChatMessage_seq_key" ON "ChatMessage"("seq");
DROP INDEX "ChatMessage_jobId_createdAt_idx";
CREATE INDEX "ChatMessage_jobId_seq_idx" ON "ChatMessage"("jobId", "seq");
