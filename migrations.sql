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

ALTER TABLE players
ADD COLUMN referral_code TEXT UNIQUE;

CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_id BIGINT REFERENCES players(telegram_id),
  referred_id BIGINT REFERENCES players(telegram_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM players WHERE referral_code = result) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_player_with_referral(
  p_username TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_telegram_id BIGINT,
  p_referral_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  player_id BIGINT,
  new_referral_code TEXT,
  bonus_applied BOOLEAN
) AS $$
DECLARE
  new_player_id BIGINT;
  referrer_id BIGINT;
  new_referral_code TEXT;
  bonus_applied BOOLEAN := FALSE;
BEGIN
  -- Generate a unique referral code for the new player
  SELECT generate_unique_referral_code() INTO new_referral_code;

  -- Insert the new player
  INSERT INTO players (username, first_name, last_name, telegram_id, referral_code, total_score)
  VALUES (p_username, p_first_name, p_last_name, p_telegram_id, new_referral_code,
    CASE WHEN p_referral_code IS NOT NULL THEN 1000 ELSE 0 END)
  RETURNING telegram_id INTO new_player_id;

  -- If a referral code was provided, process the referral
  IF p_referral_code IS NOT NULL THEN
    SELECT telegram_id INTO referrer_id
    FROM players
    WHERE referral_code = p_referral_code;

    IF referrer_id IS NOT NULL THEN
      -- Insert the referral record
      INSERT INTO referrals (referrer_id, referred_id)
      VALUES (referrer_id, new_player_id);

      -- Add bonus points to the referrer
      UPDATE players
      SET total_score = total_score + 1000
      WHERE telegram_id = referrer_id;

      bonus_applied := TRUE;
    END IF;
  END IF;

  RETURN QUERY SELECT new_player_id, new_referral_code, bonus_applied;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_referral_codes_for_existing_users()
RETURNS VOID AS $$
BEGIN
  UPDATE players
  SET referral_code = generate_unique_referral_code()
  WHERE referral_code IS NULL;
END;
$$ LANGUAGE plpgsql;

SELECT generate_referral_codes_for_existing_users(); 

ALTER TABLE players ALTER COLUMN earn_rate SET DEFAULT 2;