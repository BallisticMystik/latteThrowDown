import { db, runMigrations } from './database';

// ============================================================================
// Deterministic test IDs for easy reference in development
// ============================================================================

const TEST_USERS = [
  {
    id: 'usr_barista_01',
    email: 'lena@demo.cafe',
    password_hash: '$argon2id$v=19$m=65536,t=2,p=1$placeholder_hash_lena',
    role: 'barista',
    accepted_terms: 1,
  },
  {
    id: 'usr_barista_02',
    email: 'kai@demo.cafe',
    password_hash: '$argon2id$v=19$m=65536,t=2,p=1$placeholder_hash_kai',
    role: 'barista',
    accepted_terms: 1,
  },
  {
    id: 'usr_judge_01',
    email: 'marco@demo.cafe',
    password_hash: '$argon2id$v=19$m=65536,t=2,p=1$placeholder_hash_marco',
    role: 'judge',
    accepted_terms: 1,
  },
  {
    id: 'usr_host_01',
    email: 'host@demo.cafe',
    password_hash: '$argon2id$v=19$m=65536,t=2,p=1$placeholder_hash_host',
    role: 'host',
    accepted_terms: 1,
  },
  {
    id: 'usr_audience_01',
    email: 'audience@demo.cafe',
    password_hash: '$argon2id$v=19$m=65536,t=2,p=1$placeholder_hash_audience',
    role: 'audience',
    accepted_terms: 1,
  },
] as const;

const TEST_PROFILES = [
  {
    id: 'prf_barista_01',
    user_id: 'usr_barista_01',
    display_name: 'Lena Rossi',
    bio: 'Three-time regional latte art champion. Specializing in rosettas and swans.',
    location: 'Portland, OR',
    cafe_affiliation: 'Stumptown Coffee Roasters',
    skills: JSON.stringify(['latte_art', 'espresso', 'milk_texturing']),
    photo_url: null,
    social_links: JSON.stringify({ instagram: '@lena.latte' }),
    is_visible: 1,
    is_searchable: 1,
    allow_opportunities: 1,
  },
  {
    id: 'prf_barista_02',
    user_id: 'usr_barista_02',
    display_name: 'Kai Nakamura',
    bio: 'Specialty coffee enthusiast and latte art competitor from Seattle.',
    location: 'Seattle, WA',
    cafe_affiliation: 'Elm Coffee Roasters',
    skills: JSON.stringify(['latte_art', 'pour_over', 'espresso']),
    photo_url: null,
    social_links: JSON.stringify({ instagram: '@kai.coffee' }),
    is_visible: 1,
    is_searchable: 1,
    allow_opportunities: 1,
  },
  {
    id: 'prf_judge_01',
    user_id: 'usr_judge_01',
    display_name: 'Marco Chen',
    bio: 'SCA-certified judge with 10 years of competition experience.',
    location: 'Seattle, WA',
    cafe_affiliation: null,
    skills: JSON.stringify(['judging', 'cupping', 'sensory_analysis']),
    photo_url: null,
    social_links: JSON.stringify({ twitter: '@marcochen_coffee' }),
    is_visible: 1,
    is_searchable: 1,
    allow_opportunities: 0,
  },
  {
    id: 'prf_host_01',
    user_id: 'usr_host_01',
    display_name: 'Portland Coffee Collective',
    bio: 'Organizing latte art competitions across the Pacific Northwest.',
    location: 'Portland, OR',
    cafe_affiliation: null,
    skills: JSON.stringify(['event_management']),
    photo_url: null,
    social_links: JSON.stringify({ website: 'https://pdxcoffeecollective.com' }),
    is_visible: 1,
    is_searchable: 1,
    allow_opportunities: 0,
  },
] as const;

// ============================================================================
// Contests
// ============================================================================

const TEST_CONTESTS = [
  {
    id: 'cst_open_01',
    host_id: 'usr_host_01',
    title: 'PNW Spring Latte Art Open 2026',
    description: 'Open submission latte art competition for Pacific Northwest baristas. Show us your best pours!',
    type: 'open_submission',
    status: 'open',
    category: 'latte_art',
    region: 'Pacific Northwest',
    scoring_weights: JSON.stringify({ judges: 50, peer: 30, audience: 20 }),
    scoring_criteria: JSON.stringify([
      { id: 'sc_symmetry', name: 'Symmetry', description: 'Balance and symmetry of the design', maxScore: 6, weight: 25 },
      { id: 'sc_contrast', name: 'Contrast', description: 'Definition between milk and espresso', maxScore: 6, weight: 25 },
      { id: 'sc_complexity', name: 'Complexity', description: 'Difficulty level of the pattern', maxScore: 6, weight: 25 },
      { id: 'sc_execution', name: 'Execution', description: 'Smoothness and clean lines', maxScore: 6, weight: 25 },
    ]),
    open_at: '2026-03-01T00:00:00.000Z',
    close_at: '2026-04-01T00:00:00.000Z',
    judging_start_at: '2026-04-02T00:00:00.000Z',
    judging_end_at: '2026-04-10T00:00:00.000Z',
    max_entries: 100,
    submission_format: JSON.stringify({ mediaType: 'image', requiredAngles: ['top_down', 'side'] }),
    prize_summary: '1st: $500 + Trophy, 2nd: $250, 3rd: $100',
    is_featured: 1,
  },
  {
    id: 'cst_finalized_01',
    host_id: 'usr_host_01',
    title: 'Winter Espresso Throwdown 2025',
    description: 'Head-to-head espresso competition. Judged blind by a panel of SCA-certified judges.',
    type: 'head_to_head_bracket',
    status: 'finalized',
    category: 'espresso',
    region: 'Pacific Northwest',
    scoring_weights: JSON.stringify({ judges: 60, peer: 20, audience: 20 }),
    scoring_criteria: JSON.stringify([
      { id: 'sc_crema', name: 'Crema Quality', description: 'Color, thickness, and consistency', maxScore: 6, weight: 30 },
      { id: 'sc_taste', name: 'Taste Balance', description: 'Sweetness, acidity, bitterness balance', maxScore: 6, weight: 40 },
      { id: 'sc_body', name: 'Body', description: 'Mouthfeel and texture', maxScore: 6, weight: 30 },
    ]),
    open_at: '2025-12-01T00:00:00.000Z',
    close_at: '2025-12-20T00:00:00.000Z',
    judging_start_at: '2025-12-21T00:00:00.000Z',
    judging_end_at: '2025-12-28T00:00:00.000Z',
    max_entries: 32,
    submission_format: JSON.stringify({ mediaType: 'video', maxDuration: 120 }),
    prize_summary: '1st: $1000 + Sponsorship opportunity',
    is_featured: 0,
  },
] as const;

// ============================================================================
// Submissions
// ============================================================================

const TEST_SUBMISSIONS = [
  {
    id: 'sub_01',
    contest_id: 'cst_open_01',
    user_id: 'usr_barista_01',
    status: 'approved',
    media_url: '/uploads/lena_rosetta_topdown.jpg',
    title: 'Triple-layer Rosetta',
    caption: 'My signature triple-layer rosetta with whole milk.',
    metadata: JSON.stringify({ grind_size: '18g', yield: '36g', time_seconds: 28 }),
    agreed_originality: 1,
    submitted_at: '2026-03-10T14:30:00.000Z',
  },
  {
    id: 'sub_02',
    contest_id: 'cst_open_01',
    user_id: 'usr_barista_02',
    status: 'approved',
    media_url: '/uploads/kai_swan_topdown.jpg',
    title: 'Swan Pour',
    caption: 'First attempt at a multi-swan pour. Elm Coffee single-origin Honduras.',
    metadata: JSON.stringify({ grind_size: '17g', yield: '34g', time_seconds: 26 }),
    agreed_originality: 1,
    submitted_at: '2026-03-11T10:15:00.000Z',
  },
  {
    id: 'sub_03',
    contest_id: 'cst_open_01',
    user_id: 'usr_audience_01',
    status: 'submitted',
    media_url: '/uploads/audience_tulip.jpg',
    title: 'Tulip Pour',
    caption: 'My first competition entry - a simple tulip.',
    metadata: null,
    agreed_originality: 1,
    submitted_at: '2026-03-12T09:00:00.000Z',
  },
  {
    id: 'sub_04',
    contest_id: 'cst_finalized_01',
    user_id: 'usr_barista_01',
    status: 'approved',
    media_url: '/uploads/lena_espresso_pull.mp4',
    title: 'Precision Espresso Pull',
    caption: 'Ethiopian Yirgacheffe, light roast. 18g in, 36g out, 27 seconds.',
    metadata: JSON.stringify({ grind_size: '18g', yield: '36g', time_seconds: 27, bean: 'Ethiopian Yirgacheffe' }),
    agreed_originality: 1,
    submitted_at: '2025-12-10T11:00:00.000Z',
  },
  {
    id: 'sub_05',
    contest_id: 'cst_finalized_01',
    user_id: 'usr_barista_02',
    status: 'approved',
    media_url: '/uploads/kai_espresso_pull.mp4',
    title: 'Balanced Extraction',
    caption: 'Colombian Huila blend. Dialed in for sweetness.',
    metadata: JSON.stringify({ grind_size: '17.5g', yield: '35g', time_seconds: 29, bean: 'Colombian Huila' }),
    agreed_originality: 1,
    submitted_at: '2025-12-11T15:30:00.000Z',
  },
] as const;

// ============================================================================
// Battle (head-to-head in the finalized contest)
// ============================================================================

const TEST_BATTLES = [
  {
    id: 'btl_01',
    contest_id: 'cst_finalized_01',
    round: 1,
    position: 0,
    left_submission_id: 'sub_04',
    right_submission_id: 'sub_05',
    winner_submission_id: 'sub_04',
    status: 'completed',
    voting_opens_at: '2025-12-15T00:00:00.000Z',
    voting_closes_at: '2025-12-18T00:00:00.000Z',
  },
] as const;

// ============================================================================
// Votes
// ============================================================================

const TEST_VOTES = [
  {
    id: 'vot_01',
    battle_id: 'btl_01',
    user_id: 'usr_audience_01',
    selection: 'left',
    ip_hash: 'abc123hash',
  },
  {
    id: 'vot_02',
    battle_id: 'btl_01',
    user_id: 'usr_judge_01',
    selection: 'left',
    ip_hash: 'def456hash',
  },
] as const;

// ============================================================================
// Judge assignments and scorecards
// ============================================================================

const TEST_JUDGE_ASSIGNMENTS = [
  {
    id: 'ja_01',
    contest_id: 'cst_finalized_01',
    judge_id: 'usr_judge_01',
    submission_id: 'sub_04',
    status: 'completed',
    completed_at: '2025-12-25T12:00:00.000Z',
  },
  {
    id: 'ja_02',
    contest_id: 'cst_finalized_01',
    judge_id: 'usr_judge_01',
    submission_id: 'sub_05',
    status: 'completed',
    completed_at: '2025-12-25T14:00:00.000Z',
  },
  {
    id: 'ja_03',
    contest_id: 'cst_open_01',
    judge_id: 'usr_judge_01',
    submission_id: null,
    status: 'assigned',
    completed_at: null,
  },
] as const;

const TEST_SCORECARDS = [
  {
    id: 'sc_01',
    assignment_id: 'ja_01',
    submission_id: 'sub_04',
    judge_id: 'usr_judge_01',
    criteria_scores: JSON.stringify([
      { criterionId: 'sc_crema', score: 5, maxScore: 6 },
      { criterionId: 'sc_taste', score: 5.5, maxScore: 6 },
      { criterionId: 'sc_body', score: 4.5, maxScore: 6 },
    ]),
    total_score: 15.0,
    comments: 'Excellent crema, very balanced. Slight astringency on the tail.',
    is_blind: 1,
    status: 'submitted',
    submitted_at: '2025-12-25T12:00:00.000Z',
  },
  {
    id: 'sc_02',
    assignment_id: 'ja_02',
    submission_id: 'sub_05',
    judge_id: 'usr_judge_01',
    criteria_scores: JSON.stringify([
      { criterionId: 'sc_crema', score: 4, maxScore: 6 },
      { criterionId: 'sc_taste', score: 4.5, maxScore: 6 },
      { criterionId: 'sc_body', score: 5, maxScore: 6 },
    ]),
    total_score: 13.5,
    comments: 'Good body, but crema broke down faster than expected. Sweet finish.',
    is_blind: 1,
    status: 'submitted',
    submitted_at: '2025-12-25T14:00:00.000Z',
  },
] as const;

// ============================================================================
// Final scores (finalized contest)
// ============================================================================

const TEST_FINAL_SCORES = [
  {
    id: 'fs_01',
    submission_id: 'sub_04',
    contest_id: 'cst_finalized_01',
    judge_score: 83.3,
    peer_score: 78.0,
    audience_score: 85.0,
    weighted_total: 82.0,
    placement: 1,
  },
  {
    id: 'fs_02',
    submission_id: 'sub_05',
    contest_id: 'cst_finalized_01',
    judge_score: 75.0,
    peer_score: 80.0,
    audience_score: 70.0,
    weighted_total: 75.0,
    placement: 2,
  },
] as const;

// ============================================================================
// Notifications
// ============================================================================

const TEST_NOTIFICATIONS = [
  {
    id: 'ntf_01',
    user_id: 'usr_barista_01',
    type: 'contest_update',
    title: 'PNW Spring Latte Art Open is now open for submissions!',
    body: 'Submit your best latte art before April 1st.',
    link_type: 'contest',
    link_id: 'cst_open_01',
    is_read: 0,
  },
  {
    id: 'ntf_02',
    user_id: 'usr_barista_01',
    type: 'score_posted',
    title: 'Your Winter Espresso Throwdown scores are in!',
    body: 'You placed 1st with a weighted score of 82.0.',
    link_type: 'contest',
    link_id: 'cst_finalized_01',
    is_read: 1,
  },
  {
    id: 'ntf_03',
    user_id: 'usr_barista_02',
    type: 'battle_result',
    title: 'Battle result: Winter Espresso Throwdown Round 1',
    body: null,
    link_type: 'battle',
    link_id: 'btl_01',
    is_read: 0,
  },
  {
    id: 'ntf_04',
    user_id: 'usr_barista_01',
    type: 'new_follower',
    title: 'You have a new follower!',
    body: null,
    link_type: 'profile',
    link_id: 'prf_barista_02',
    is_read: 0,
  },
  {
    id: 'ntf_05',
    user_id: 'usr_barista_02',
    type: 'submission_status',
    title: 'Your submission was approved',
    body: 'Swan Pour has been approved for the PNW Spring Latte Art Open.',
    link_type: 'submission',
    link_id: 'sub_02',
    is_read: 1,
  },
] as const;

// ============================================================================
// Ranking snapshots
// ============================================================================

const TEST_RANKING_SNAPSHOTS = [
  {
    id: 'rnk_01',
    user_id: 'usr_barista_01',
    category: 'overall',
    score: 1082.0,
    rank: 1,
    region: 'Portland, OR',
    contests_counted: 1,
    avg_placement: 1.0,
    consistency_score: 82.0,
    momentum_score: 5.0,
  },
  {
    id: 'rnk_02',
    user_id: 'usr_barista_02',
    category: 'overall',
    score: 1075.0,
    rank: 2,
    region: 'Seattle, WA',
    contests_counted: 1,
    avg_placement: 2.0,
    consistency_score: 75.0,
    momentum_score: 3.0,
  },
  {
    id: 'rnk_03',
    user_id: 'usr_barista_01',
    category: 'espresso',
    score: 1082.0,
    rank: 1,
    region: 'Portland, OR',
    contests_counted: 1,
    avg_placement: 1.0,
    consistency_score: 82.0,
    momentum_score: 5.0,
  },
  {
    id: 'rnk_04',
    user_id: 'usr_barista_02',
    category: 'espresso',
    score: 1075.0,
    rank: 2,
    region: 'Seattle, WA',
    contests_counted: 1,
    avg_placement: 2.0,
    consistency_score: 75.0,
    momentum_score: 3.0,
  },
] as const;

// ============================================================================
// Seed runner
// ============================================================================

async function seed() {
  console.log('Running migrations...');
  await runMigrations();

  console.log('Seeding test data...');

  // -- Users --
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, role, accepted_terms)
    VALUES ($id, $email, $password_hash, $role, $accepted_terms)
  `);

  // -- Profiles --
  const insertProfile = db.prepare(`
    INSERT OR IGNORE INTO profiles (
      id, user_id, display_name, bio, location, cafe_affiliation,
      skills, photo_url, social_links, is_visible, is_searchable, allow_opportunities
    ) VALUES (
      $id, $user_id, $display_name, $bio, $location, $cafe_affiliation,
      $skills, $photo_url, $social_links, $is_visible, $is_searchable, $allow_opportunities
    )
  `);

  // -- Follows --
  const insertFollow = db.prepare(`
    INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES ($follower_id, $following_id)
  `);

  // -- Contests --
  const insertContest = db.prepare(`
    INSERT OR IGNORE INTO contests (
      id, host_id, title, description, type, status, category, region,
      scoring_weights, scoring_criteria, open_at, close_at,
      judging_start_at, judging_end_at, max_entries,
      submission_format, prize_summary, is_featured
    ) VALUES (
      $id, $host_id, $title, $description, $type, $status, $category, $region,
      $scoring_weights, $scoring_criteria, $open_at, $close_at,
      $judging_start_at, $judging_end_at, $max_entries,
      $submission_format, $prize_summary, $is_featured
    )
  `);

  // -- Submissions --
  const insertSubmission = db.prepare(`
    INSERT OR IGNORE INTO submissions (
      id, contest_id, user_id, status, media_url, title, caption,
      metadata, agreed_originality, submitted_at
    ) VALUES (
      $id, $contest_id, $user_id, $status, $media_url, $title, $caption,
      $metadata, $agreed_originality, $submitted_at
    )
  `);

  // -- Battles --
  const insertBattle = db.prepare(`
    INSERT OR IGNORE INTO battles (
      id, contest_id, round, position, left_submission_id, right_submission_id,
      winner_submission_id, status, voting_opens_at, voting_closes_at
    ) VALUES (
      $id, $contest_id, $round, $position, $left_submission_id, $right_submission_id,
      $winner_submission_id, $status, $voting_opens_at, $voting_closes_at
    )
  `);

  // -- Votes --
  const insertVote = db.prepare(`
    INSERT OR IGNORE INTO votes (id, battle_id, user_id, selection, ip_hash)
    VALUES ($id, $battle_id, $user_id, $selection, $ip_hash)
  `);

  // -- Judge assignments --
  const insertJA = db.prepare(`
    INSERT OR IGNORE INTO judge_assignments (
      id, contest_id, judge_id, submission_id, status, completed_at
    ) VALUES ($id, $contest_id, $judge_id, $submission_id, $status, $completed_at)
  `);

  // -- Scorecards --
  const insertScorecard = db.prepare(`
    INSERT OR IGNORE INTO scorecards (
      id, assignment_id, submission_id, judge_id,
      criteria_scores, total_score, comments, is_blind, status, submitted_at
    ) VALUES (
      $id, $assignment_id, $submission_id, $judge_id,
      $criteria_scores, $total_score, $comments, $is_blind, $status, $submitted_at
    )
  `);

  // -- Final scores --
  const insertFinalScore = db.prepare(`
    INSERT OR IGNORE INTO final_scores (
      id, submission_id, contest_id,
      judge_score, peer_score, audience_score, weighted_total, placement
    ) VALUES (
      $id, $submission_id, $contest_id,
      $judge_score, $peer_score, $audience_score, $weighted_total, $placement
    )
  `);

  // -- Notifications --
  const insertNotification = db.prepare(`
    INSERT OR IGNORE INTO notifications (
      id, user_id, type, title, body, link_type, link_id, is_read
    ) VALUES ($id, $user_id, $type, $title, $body, $link_type, $link_id, $is_read)
  `);

  // -- Ranking snapshots --
  const insertRanking = db.prepare(`
    INSERT OR IGNORE INTO ranking_snapshots (
      id, user_id, category, score, rank, region,
      contests_counted, avg_placement, consistency_score, momentum_score
    ) VALUES (
      $id, $user_id, $category, $score, $rank, $region,
      $contests_counted, $avg_placement, $consistency_score, $momentum_score
    )
  `);

  db.transaction(() => {
    // Users
    for (const u of TEST_USERS) {
      insertUser.run({
        $id: u.id,
        $email: u.email,
        $password_hash: u.password_hash,
        $role: u.role,
        $accepted_terms: u.accepted_terms,
      });
    }

    // Profiles
    for (const p of TEST_PROFILES) {
      insertProfile.run({
        $id: p.id,
        $user_id: p.user_id,
        $display_name: p.display_name,
        $bio: p.bio,
        $location: p.location,
        $cafe_affiliation: p.cafe_affiliation,
        $skills: p.skills,
        $photo_url: p.photo_url,
        $social_links: p.social_links,
        $is_visible: p.is_visible,
        $is_searchable: p.is_searchable,
        $allow_opportunities: p.allow_opportunities,
      });
    }

    // Follows: audience follows barista_01, barista_02 follows barista_01
    insertFollow.run({ $follower_id: 'usr_audience_01', $following_id: 'usr_barista_01' });
    insertFollow.run({ $follower_id: 'usr_barista_02', $following_id: 'usr_barista_01' });

    // Contests
    for (const c of TEST_CONTESTS) {
      insertContest.run({
        $id: c.id,
        $host_id: c.host_id,
        $title: c.title,
        $description: c.description,
        $type: c.type,
        $status: c.status,
        $category: c.category,
        $region: c.region,
        $scoring_weights: c.scoring_weights,
        $scoring_criteria: c.scoring_criteria,
        $open_at: c.open_at,
        $close_at: c.close_at,
        $judging_start_at: c.judging_start_at,
        $judging_end_at: c.judging_end_at,
        $max_entries: c.max_entries,
        $submission_format: c.submission_format,
        $prize_summary: c.prize_summary,
        $is_featured: c.is_featured,
      });
    }

    // Submissions
    for (const s of TEST_SUBMISSIONS) {
      insertSubmission.run({
        $id: s.id,
        $contest_id: s.contest_id,
        $user_id: s.user_id,
        $status: s.status,
        $media_url: s.media_url,
        $title: s.title,
        $caption: s.caption,
        $metadata: s.metadata,
        $agreed_originality: s.agreed_originality,
        $submitted_at: s.submitted_at,
      });
    }

    // Battles
    for (const b of TEST_BATTLES) {
      insertBattle.run({
        $id: b.id,
        $contest_id: b.contest_id,
        $round: b.round,
        $position: b.position,
        $left_submission_id: b.left_submission_id,
        $right_submission_id: b.right_submission_id,
        $winner_submission_id: b.winner_submission_id,
        $status: b.status,
        $voting_opens_at: b.voting_opens_at,
        $voting_closes_at: b.voting_closes_at,
      });
    }

    // Votes
    for (const v of TEST_VOTES) {
      insertVote.run({
        $id: v.id,
        $battle_id: v.battle_id,
        $user_id: v.user_id,
        $selection: v.selection,
        $ip_hash: v.ip_hash,
      });
    }

    // Judge assignments
    for (const ja of TEST_JUDGE_ASSIGNMENTS) {
      insertJA.run({
        $id: ja.id,
        $contest_id: ja.contest_id,
        $judge_id: ja.judge_id,
        $submission_id: ja.submission_id,
        $status: ja.status,
        $completed_at: ja.completed_at,
      });
    }

    // Scorecards
    for (const sc of TEST_SCORECARDS) {
      insertScorecard.run({
        $id: sc.id,
        $assignment_id: sc.assignment_id,
        $submission_id: sc.submission_id,
        $judge_id: sc.judge_id,
        $criteria_scores: sc.criteria_scores,
        $total_score: sc.total_score,
        $comments: sc.comments,
        $is_blind: sc.is_blind,
        $status: sc.status,
        $submitted_at: sc.submitted_at,
      });
    }

    // Final scores
    for (const fs of TEST_FINAL_SCORES) {
      insertFinalScore.run({
        $id: fs.id,
        $submission_id: fs.submission_id,
        $contest_id: fs.contest_id,
        $judge_score: fs.judge_score,
        $peer_score: fs.peer_score,
        $audience_score: fs.audience_score,
        $weighted_total: fs.weighted_total,
        $placement: fs.placement,
      });
    }

    // Notifications
    for (const n of TEST_NOTIFICATIONS) {
      insertNotification.run({
        $id: n.id,
        $user_id: n.user_id,
        $type: n.type,
        $title: n.title,
        $body: n.body,
        $link_type: n.link_type,
        $link_id: n.link_id,
        $is_read: n.is_read,
      });
    }

    // Ranking snapshots
    for (const r of TEST_RANKING_SNAPSHOTS) {
      insertRanking.run({
        $id: r.id,
        $user_id: r.user_id,
        $category: r.category,
        $score: r.score,
        $rank: r.rank,
        $region: r.region,
        $contests_counted: r.contests_counted,
        $avg_placement: r.avg_placement,
        $consistency_score: r.consistency_score,
        $momentum_score: r.momentum_score,
      });
    }

    // Award some badges
    db.prepare(`INSERT OR IGNORE INTO user_badges (user_id, badge_id, contest_id) VALUES (?, ?, ?)`)
      .run('usr_barista_01', 'badge_first_entry', 'cst_finalized_01');
    db.prepare(`INSERT OR IGNORE INTO user_badges (user_id, badge_id, contest_id) VALUES (?, ?, ?)`)
      .run('usr_barista_01', 'badge_first_win', 'cst_finalized_01');
    db.prepare(`INSERT OR IGNORE INTO user_badges (user_id, badge_id, contest_id) VALUES (?, ?, ?)`)
      .run('usr_barista_02', 'badge_first_entry', 'cst_finalized_01');
    db.prepare(`INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)`)
      .run('usr_judge_01', 'badge_verified_judge');
  })();

  // ========================================================================
  // Verify
  // ========================================================================
  const counts = [
    ['users', 'SELECT COUNT(*) AS c FROM users'],
    ['profiles', 'SELECT COUNT(*) AS c FROM profiles'],
    ['follows', 'SELECT COUNT(*) AS c FROM follows'],
    ['contests', 'SELECT COUNT(*) AS c FROM contests'],
    ['submissions', 'SELECT COUNT(*) AS c FROM submissions'],
    ['battles', 'SELECT COUNT(*) AS c FROM battles'],
    ['votes', 'SELECT COUNT(*) AS c FROM votes'],
    ['judge_assignments', 'SELECT COUNT(*) AS c FROM judge_assignments'],
    ['scorecards', 'SELECT COUNT(*) AS c FROM scorecards'],
    ['final_scores', 'SELECT COUNT(*) AS c FROM final_scores'],
    ['notifications', 'SELECT COUNT(*) AS c FROM notifications'],
    ['ranking_snapshots', 'SELECT COUNT(*) AS c FROM ranking_snapshots'],
    ['user_badges', 'SELECT COUNT(*) AS c FROM user_badges'],
  ] as const;

  console.log('Seed results:');
  for (const [name, sql] of counts) {
    const { c } = db.query(sql).get() as { c: number };
    console.log(`  ${name}: ${c}`);
  }

  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
