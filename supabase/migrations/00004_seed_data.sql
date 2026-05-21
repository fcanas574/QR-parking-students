-- Seed parking lots
INSERT INTO parking_lots (name, total_spaces, latitude, longitude) VALUES
    ('Lot A', 200, 40.7128, -74.0060),
    ('Lot B', 150, 40.7130, -74.0065),
    ('Lot C', 300, 40.7140, -74.0070),
    ('Visitor Lot V', 80, 40.7110, -74.0050);

-- Seed occupancy rows
INSERT INTO lot_occupancy (lot_id, current_count)
SELECT id, 0 FROM parking_lots;
