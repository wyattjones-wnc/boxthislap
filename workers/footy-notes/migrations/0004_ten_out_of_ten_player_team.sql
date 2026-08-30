ALTER TABLE footy_ten_out_of_ten
ADD COLUMN player_team_side TEXT NOT NULL DEFAULT '' CHECK (player_team_side IN ('', 'home', 'away'));

