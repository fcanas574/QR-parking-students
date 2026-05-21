-- Update lot occupancy on entry
CREATE OR REPLACE FUNCTION update_occupancy_on_entry()
RETURNS trigger AS $$
BEGIN
    IF NEW.direction = 'entry' THEN
        INSERT INTO lot_occupancy (lot_id, current_count, last_updated)
        VALUES (NEW.lot_id, 1, now())
        ON CONFLICT (lot_id) DO UPDATE
        SET current_count = lot_occupancy.current_count + 1,
            last_updated = now();
    ELSIF NEW.direction = 'exit' THEN
        UPDATE lot_occupancy
        SET current_count = GREATEST(current_count - 1, 0),
            last_updated = now()
        WHERE lot_id = NEW.lot_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_occupancy_on_access
    AFTER INSERT ON access_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_occupancy_on_entry();

-- Auto-create profile on first Clerk sign-in (called from Edge Function)
CREATE OR REPLACE FUNCTION create_profile_if_not_exists(
    p_clerk_id text,
    p_full_name text,
    p_role user_role,
    p_email text
)
RETURNS uuid AS $$
DECLARE
    v_profile_id uuid;
BEGIN
    INSERT INTO profiles (clerk_id, full_name, role, email)
    VALUES (p_clerk_id, p_full_name, p_role, p_email)
    ON CONFLICT (clerk_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email
    RETURNING id INTO v_profile_id;

    RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
