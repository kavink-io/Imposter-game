// Supabase Edge Function: game-action
// Provides secure server-side execution for Imposter Party game operations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, payload } = await req.json();

    let result;
    switch (action) {
      case "create_room":
        result = await supabaseClient.rpc("rpc_create_room", {
          p_host_name: payload.host_name,
          p_settings: payload.settings || {},
        });
        break;

      case "join_room":
        result = await supabaseClient.rpc("rpc_join_room", {
          p_room_code: payload.room_code,
          p_player_name: payload.player_name,
        });
        break;

      case "start_round":
        result = await supabaseClient.rpc("rpc_start_round", {
          p_room_code: payload.room_code,
          p_host_token: payload.host_token,
          p_topic_mode: payload.topic_mode || "random",
          p_manual_topic: payload.manual_topic || "",
          p_manual_clue: payload.manual_clue || "",
          p_imposter_count: payload.imposter_count || 0,
          p_include_joker: payload.include_joker !== undefined ? payload.include_joker : true,
        });
        break;

      case "get_my_private_role":
        result = await supabaseClient.rpc("rpc_get_my_private_role", {
          p_room_code: payload.room_code,
          p_player_token: payload.player_token,
        });
        break;

      case "set_game_phase":
        result = await supabaseClient.rpc("rpc_set_game_phase", {
          p_room_code: payload.room_code,
          p_host_token: payload.host_token,
          p_new_phase: payload.new_phase,
        });
        break;

      case "submit_vote":
        result = await supabaseClient.rpc("rpc_submit_vote", {
          p_room_code: payload.room_code,
          p_player_token: payload.player_token,
          p_target_player_id: payload.target_player_id,
        });
        break;

      case "end_voting_and_tally":
        result = await supabaseClient.rpc("rpc_end_voting_and_tally", {
          p_room_code: payload.room_code,
          p_host_token: payload.host_token,
        });
        break;

      case "proceed_to_next_round":
        result = await supabaseClient.rpc("rpc_proceed_to_next_round", {
          p_room_code: payload.room_code,
          p_host_token: payload.host_token,
        });
        break;

      case "start_next_round":
        result = await supabaseClient.rpc("rpc_start_next_round", {
          p_room_code: payload.room_code,
          p_host_token: payload.host_token,
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify(result.data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
