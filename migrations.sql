CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  telegram_id BIGINT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE players
ADD COLUMN total_score BIGINT DEFAULT 0,
ADD COLUMN attempts_count INTEGER DEFAULT 0,
ADD COLUMN high_score BIGINT DEFAULT 0;

ALTER TABLE players
ADD COLUMN totearn_rate BIGINT DEFAULT 1;

ALTER TABLE players RENAME COLUMN totearn_rate TO earn_rate;

CREATE OR REPLACE FUNCTION update_player_scores(p_telegram_id BIGINT, p_score INT)
RETURNS VOID AS $$
BEGIN
  UPDATE players
  SET 
    total_score = total_score + p_score,
    attempts_count = attempts_count + 1,
    high_score = GREATEST(high_score, p_score)
  WHERE telegram_id = p_telegram_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION increase_earn_rate(p_telegram_id BIGINT)
RETURNS TABLE (
  new_earn_rate BIGINT,
  new_total_score BIGINT
) AS $$
DECLARE
  current_earn_rate BIGINT;
  current_total_score BIGINT;
  score_reduction BIGINT;
BEGIN
  -- Get current earn rate and total score
  SELECT earn_rate, total_score
  INTO current_earn_rate, current_total_score
  FROM players
  WHERE telegram_id = p_telegram_id;

  -- Calculate score reduction
  score_reduction := current_earn_rate * 200;

  -- Check if player has enough score
  IF current_total_score < score_reduction THEN
    RAISE EXCEPTION 'Insufficient total score to increase earn rate';
  END IF;

  -- Update player's earn rate and total score
  UPDATE players
  SET 
    earn_rate = earn_rate + 1,
    total_score = total_score - score_reduction
  WHERE telegram_id = p_telegram_id
  RETURNING earn_rate, total_score
  INTO new_earn_rate, new_total_score;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;