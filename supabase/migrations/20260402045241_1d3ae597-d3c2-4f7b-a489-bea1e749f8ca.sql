
-- Create a function to grade quizzes server-side
CREATE OR REPLACE FUNCTION public.grade_quiz(p_quiz_id uuid, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_correct integer := 0;
  v_total integer := 0;
  v_question RECORD;
  v_user_answer integer;
  v_results jsonb := '[]'::jsonb;
BEGIN
  FOR v_question IN
    SELECT id, correct_answer_index
    FROM public.quiz_questions
    WHERE quiz_id = p_quiz_id
    ORDER BY sort_order
  LOOP
    v_total := v_total + 1;
    v_user_answer := (p_answers->>v_question.id::text)::integer;
    IF v_user_answer IS NOT NULL AND v_user_answer = v_question.correct_answer_index THEN
      v_correct := v_correct + 1;
      v_results := v_results || jsonb_build_object('question_id', v_question.id, 'correct', true);
    ELSE
      v_results := v_results || jsonb_build_object('question_id', v_question.id, 'correct', false);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'score', v_correct,
    'total', v_total,
    'results', v_results
  );
END;
$$;
