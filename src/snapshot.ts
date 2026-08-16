import fs from "fs";
import path from "path";

export class SnapshotManager {
  private dir: string;

  constructor(snapshotDir: string) {
    this.dir = snapshotDir;
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  private filePath(suiteName: string, testName: string): string {
    const safe = (s: string) => s.replace(/[^a-zA-Z0-9_\-]/g, "_");
    return path.join(this.dir, `${safe(suiteName)}__${safe(testName)}.snap.json`);
  }

  exists(suiteName: string, testName: string): boolean {
    return fs.existsSync(this.filePath(suiteName, testName));
  }

  read(suiteName: string, testName: string): unknown | undefined {
    const fp = this.filePath(suiteName, testName);
    if (!fs.existsSync(fp)) return undefined;
    try {
      return JSON.parse(fs.readFileSync(fp, "utf8"));
    } catch {
      return undefined;
    }
  }

  write(suiteName: string, testName: string, value: unknown): void {
    const fp = this.filePath(suiteName, testName);
    fs.writeFileSync(fp, JSON.stringify(value, null, 2) + "\n", "utf8");
  }

  delete(suiteName: string, testName: string): void {
    const fp = this.filePath(suiteName, testName);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
}
