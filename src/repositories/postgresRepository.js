export class PostgresResearchRepository {
  constructor(connectionString) {
    this.connectionString = connectionString;
    this.pool = null;
  }

  async init() {
    const pg = await import("pg");
    this.pool = new pg.Pool({
      connectionString: this.connectionString
    });
    await this.pool.query("SELECT 1");
  }

  async save(researchCase) {
    const now = new Date().toISOString();
    const result = {
      ...researchCase,
      updatedAt: now
    };
    await this.pool.query(
      `
        INSERT INTO research_cases (
          id, address, normalized_address, status, owner_status, owner_name,
          owner_confidence, result, audit_log, created_at, updated_at, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12)
        ON CONFLICT (id)
        DO UPDATE SET
          address = EXCLUDED.address,
          normalized_address = EXCLUDED.normalized_address,
          status = EXCLUDED.status,
          owner_status = EXCLUDED.owner_status,
          owner_name = EXCLUDED.owner_name,
          owner_confidence = EXCLUDED.owner_confidence,
          result = EXCLUDED.result,
          audit_log = EXCLUDED.audit_log,
          updated_at = EXCLUDED.updated_at,
          expires_at = EXCLUDED.expires_at
      `,
      [
        result.id,
        result.address,
        result.normalizedAddress,
        result.status,
        result.owner.status,
        result.owner.name,
        result.owner.confidence,
        JSON.stringify(result),
        JSON.stringify(result.auditLog),
        result.createdAt,
        result.updatedAt,
        result.expiresAt
      ]
    );
    return result;
  }

  async findById(id) {
    const response = await this.pool.query("SELECT result FROM research_cases WHERE id = $1", [id]);
    return response.rows[0]?.result ?? null;
  }

  async list(limit = 50) {
    const response = await this.pool.query("SELECT result FROM research_cases ORDER BY created_at DESC LIMIT $1", [limit]);
    return response.rows.map((row) => row.result);
  }
}
