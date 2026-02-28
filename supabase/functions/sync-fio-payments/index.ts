const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Remove diacritics and lowercase */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Parse the Fio transparent account HTML and extract transactions */
function parseTransactions(html: string): Array<{
  date: string;
  amount: number;
  senderName: string;
  message: string;
  vs: string;
  note: string;
}> {
  const transactions: Array<{
    date: string;
    amount: number;
    senderName: string;
    message: string;
    vs: string;
    note: string;
  }> = [];

  // Find the main transaction table - look for rows with transaction data
  // Fio transparent account HTML has a table with class "table" or similar
  // Each row has: Datum, Objem, Měna, Protiúčet, Kód banky, KS, VS, SS, Poznámka, Typ, Kdo zadal, Název protiúčtu, ...
  
  // Strategy: find all <tr> elements, extract <td> content
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").trim();

  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cells: string[] = [];
    let cellMatch;
    // Reset lastIndex for cellRegex
    cellRegex.lastIndex = 0;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(stripHtml(cellMatch[1]));
    }

    // Fio transparent table columns (typical order):
    // 0: Datum, 1: Objem, 2: Měna, 3: Protiúčet, 4: Kód banky, 
    // 5: KS, 6: VS, 7: SS, 8: Poznámka, 9: Typ
    // But the exact layout may vary. We need at least date + amount.
    
    if (cells.length < 3) continue;

    // Try to parse date (DD.MM.YYYY format)
    const dateMatch = cells[0]?.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (!dateMatch) continue;

    const day = dateMatch[1].padStart(2, "0");
    const month = dateMatch[2].padStart(2, "0");
    const year = dateMatch[3];
    const isoDate = `${year}-${month}-${day}`;

    // Parse amount - remove spaces, replace comma with dot
    const amountStr = cells[1]?.replace(/\s/g, "").replace(",", ".");
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) continue;

    // Extract other fields
    const vs = cells.length > 6 ? cells[6] || "" : "";
    const note = cells.length > 8 ? cells[8] || "" : "";
    
    // Sender name - try different positions
    // In Fio transparent, "Název protiúčtu" is typically one of the later columns
    // and "Zpráva pro příjemce" / "Poznámka" contains the user message
    let senderName = "";
    // Look for sender in cells beyond the standard numeric fields
    if (cells.length > 9) {
      // Try column 9+ for sender name text
      for (let i = 9; i < cells.length; i++) {
        if (cells[i] && cells[i].length > 1 && !/^\d+$/.test(cells[i])) {
          senderName = cells[i];
          break;
        }
      }
    }
    if (!senderName && cells.length > 3) {
      senderName = cells[3] || "";
    }

    transactions.push({
      date: isoDate,
      amount,
      senderName,
      message: note,
      vs,
      note,
    });
  }

  return transactions;
}

/** Check if playerName matches in any of the transaction text fields */
function fuzzyMatch(
  playerName: string,
  senderName: string,
  message: string,
  note: string
): boolean {
  if (!playerName) return false;
  const np = normalize(playerName);
  if (np.length < 3) return false;

  const fields = [senderName, message, note].map(normalize).filter((f) => f.length > 0);

  for (const field of fields) {
    // Substring match in both directions
    if (field.includes(np) || np.includes(field)) return true;

    // Also try matching individual words of the player name
    const words = np.split(/\s+/).filter((w) => w.length >= 3);
    if (words.length >= 2) {
      const allWordsFound = words.every((w) => field.includes(w));
      if (allWordsFound) return true;
    }
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { run_id } = await req.json();
    if (!run_id) {
      return new Response(
        JSON.stringify({ success: false, error: "run_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get run info
    const { data: run, error: runErr } = await supabase
      .from("runs")
      .select("id, payment_amount, payment_account, larp_id")
      .eq("id", run_id)
      .single();

    if (runErr || !run) {
      return new Response(
        JSON.stringify({ success: false, error: "Run not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentAmount = parseFloat((run.payment_amount || "0").replace(/\s/g, "").replace(",", "."));
    if (!paymentAmount || paymentAmount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Run has no payment_amount set" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unpaid assignments
    const { data: unpaidAssignments } = await supabase
      .from("run_person_assignments")
      .select("id, player_name, person_id")
      .eq("run_id", run_id)
      .is("paid_at", null);

    const unpaid = unpaidAssignments || [];

    // Determine account number for Fio URL
    // Default to the plan's account, but use run's payment_account if it looks like an account number
    const accountNumber = run.payment_account?.replace(/\s/g, "").replace(/\//g, "") || "2601234979";
    const fioUrl = `https://ib.fio.cz/ib/transparent?a=${accountNumber}`;

    console.log(`Fetching Fio transparent account: ${fioUrl}`);

    // Fetch the Fio transparent page
    const fioResponse = await fetch(fioUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LarpGateway/1.0)",
        "Accept": "text/html",
        "Accept-Language": "cs,en;q=0.5",
      },
    });

    if (!fioResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Fio returned ${fioResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await fioResponse.text();
    const transactions = parseTransactions(html);
    console.log(`Parsed ${transactions.length} transactions from Fio`);

    // Filter transactions matching the payment amount (with small tolerance)
    const matchingTxns = transactions.filter(
      (t) => t.amount > 0 && Math.abs(t.amount - paymentAmount) < 0.01
    );
    console.log(`${matchingTxns.length} transactions match payment amount ${paymentAmount}`);

    let matched = 0;
    let unmatched = 0;
    const unmatchedList: Array<{ date: string; amount: number; sender: string; message: string }> = [];

    for (const txn of matchingTxns) {
      // Check if already processed (deduplicate)
      const { data: existing } = await supabase
        .from("payment_sync_log")
        .select("id")
        .eq("run_id", run_id)
        .eq("transaction_date", txn.date)
        .eq("amount", txn.amount)
        .eq("sender_name", txn.senderName || "")
        .maybeSingle();

      if (existing) continue; // Already processed

      // Try to match with unpaid players
      let matchedAssignment: typeof unpaid[0] | null = null;
      for (const a of unpaid) {
        if (a.player_name && fuzzyMatch(a.player_name, txn.senderName, txn.message, txn.note)) {
          matchedAssignment = a;
          break;
        }
      }

      if (matchedAssignment) {
        // Mark as paid
        await supabase
          .from("run_person_assignments")
          .update({ paid_at: new Date().toISOString() })
          .eq("id", matchedAssignment.id);

        // Log the match
        await supabase.from("payment_sync_log").insert({
          run_id,
          assignment_id: matchedAssignment.id,
          transaction_date: txn.date,
          amount: txn.amount,
          sender_name: txn.senderName || null,
          message: txn.message || null,
          vs: txn.vs || null,
          matched: true,
          matched_player_name: matchedAssignment.player_name,
        });

        // Remove from unpaid list so we don't double-match
        const idx = unpaid.indexOf(matchedAssignment);
        if (idx >= 0) unpaid.splice(idx, 1);

        matched++;
      } else {
        // Log as unmatched
        await supabase.from("payment_sync_log").insert({
          run_id,
          transaction_date: txn.date,
          amount: txn.amount,
          sender_name: txn.senderName || null,
          message: txn.message || null,
          vs: txn.vs || null,
          matched: false,
        });

        unmatched++;
        unmatchedList.push({
          date: txn.date,
          amount: txn.amount,
          sender: txn.senderName,
          message: txn.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        matched,
        unmatched,
        total_transactions: transactions.length,
        matching_amount: matchingTxns.length,
        unmatched_list: unmatchedList,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in sync-fio-payments:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
