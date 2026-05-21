-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_occupancy ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE clerk_id = auth.jwt()->>'sub';
$$ LANGUAGE sql STABLE;

-- Profiles: users can read own, security+ can read all
CREATE POLICY "Users read own profile" ON profiles
    FOR SELECT USING (clerk_id = auth.jwt()->>'sub');
CREATE POLICY "Security read all profiles" ON profiles
    FOR SELECT USING (current_user_role() IN ('security', 'admin', 'super_admin'));

-- Vehicles: users CRUD own, security+ read all
CREATE POLICY "Users manage own vehicles" ON vehicles
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE clerk_id = auth.jwt()->>'sub'));
CREATE POLICY "Security read all vehicles" ON vehicles
    FOR SELECT USING (current_user_role() IN ('security', 'admin', 'super_admin'));

-- Parking lots: everyone can read
CREATE POLICY "Everyone reads lots" ON parking_lots
    FOR SELECT USING (true);

-- Permits: users read own, admin manages
CREATE POLICY "Users read own permits" ON permits
    FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE clerk_id = auth.jwt()->>'sub'));
CREATE POLICY "Security read all permits" ON permits
    FOR SELECT USING (current_user_role() IN ('security', 'admin', 'super_admin'));
CREATE POLICY "Admin manages permits" ON permits
    FOR ALL USING (current_user_role() IN ('admin', 'super_admin'));

-- Access logs: security inserts, users read own, admin reads all
CREATE POLICY "Security inserts logs" ON access_logs
    FOR INSERT WITH CHECK (current_user_role() IN ('security', 'admin', 'super_admin'));
CREATE POLICY "Users read own logs" ON access_logs
    FOR SELECT USING (vehicle_id IN (
        SELECT id FROM vehicles WHERE profile_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt()->>'sub'
        )
    ));
CREATE POLICY "Security reads all logs" ON access_logs
    FOR SELECT USING (current_user_role() IN ('security', 'admin', 'super_admin'));

-- Lot occupancy: everyone reads
CREATE POLICY "Everyone reads occupancy" ON lot_occupancy
    FOR SELECT USING (true);
CREATE POLICY "Security updates occupancy" ON lot_occupancy
    FOR UPDATE USING (current_user_role() IN ('security', 'admin', 'super_admin'));
