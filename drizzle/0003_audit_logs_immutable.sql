-- Log audit hanya boleh ditambah. UPDATE, DELETE, dan TRUNCATE ditolak di level database,
-- sehingga tidak ada kode aplikasi (atau akun dengan akses UI) yang dapat mengubah jejak audit.
-- Pengguna tidak pernah dihapus permanen (hanya dinonaktifkan), jadi FK actor_id memakai RESTRICT.
CREATE FUNCTION audit_logs_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs bersifat append-only: % ditolak', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();--> statement-breakpoint
CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_block_mutation();
