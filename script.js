// ==========================================
// MYBANK - SUPABASE CONFIGURATION
// ==========================================

const SUPABASE_URL =
  "https://ncihofyhnpxrftilejij.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_FDd8fKnlcN8RBqSqovQlIQ_-cx_tZwi";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


// ==========================================
// GET CURRENT USER
// ==========================================

async function getCurrentUser() {

  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("User Error:", error);
    return null;
  }

  return user;
}


// ==========================================
// DASHBOARD
// ==========================================

async function loadDashboard() {

  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }


  // ==========================================
  // CUSTOMER
  // ==========================================

  const {
    data: customer,
    error: customerError
  } = await supabaseClient
    .from("customers")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();


  if (customerError || !customer) {

    console.error("Customer Error:", customerError);

    document.getElementById("message").innerText =
      "Customer information not found.";

    return;
  }


  document.getElementById("customerName").innerText =
    customer.full_name || "Customer";


  // ==========================================
  // ACCOUNT
  // ==========================================

  const {
    data: accounts,
    error: accountError
  } = await supabaseClient
    .from("accounts")
    .select("*")
    .eq("customer_id", customer.id)
    .order("created_at", {
      ascending: false
    });


  if (accountError) {

    console.error("Account Error:", accountError);

    document.getElementById("message").innerText =
      "Account information error: " +
      accountError.message;

    return;
  }


  if (!accounts || accounts.length === 0) {

    document.getElementById("message").innerText =
      "Account information not found.";

    return;
  }


  console.log("Customer:", customer);
  console.log("Accounts:", accounts);


  // First account
  const account = accounts[0];


  // Account Number
  document.getElementById("accountNumber").innerText =
    account.account_number || "-";


  // Account Type
  document.getElementById("accountType").innerText =
    account.account_type || "-";


  // Balance
  document.getElementById("balance").innerText =
    "₹" + Number(account.balance || 0).toFixed(2);


  // ==========================================
  // TRANSACTIONS
  // ==========================================

  await loadTransactions(account.id);
}


// ==========================================
// RECENT TRANSACTIONS
// ==========================================

async function loadTransactions(accountId) {

  const {
    data: transactions,
    error
  } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", {
      ascending: false
    })
    .limit(10);


  const list =
    document.getElementById("transactionList");


  if (!list) return;


  list.innerHTML = "";


  if (error) {

    console.error(
      "Transaction Error:",
      error
    );

    list.innerHTML =
      `<tr>
        <td colspan="4">
          Unable to load transactions
        </td>
      </tr>`;

    return;
  }


  if (!transactions || transactions.length === 0) {

    list.innerHTML =
      `<tr>
        <td colspan="4">
          No transactions found
        </td>
      </tr>`;

    return;
  }


  transactions.forEach(function(transaction) {

    const row =
      document.createElement("tr");


    const type =
      transaction.transaction_type ||
      transaction.type ||
      "-";


    const typeClass =
      type === "CREDIT"
        ? "credit"
        : "debit";


    row.innerHTML = `
      <td class="${typeClass}">
        ${type}
      </td>

      <td>
        ₹${Number(transaction.amount || 0).toFixed(2)}
      </td>

      <td>
        ${transaction.description || "-"}
      </td>

      <td>
        ${transaction.status || "-"}
      </td>
    `;


    list.appendChild(row);

  });
}


// ==========================================
// LOGOUT
// ==========================================

document
  .getElementById("logoutBtn")
  .addEventListener("click", async function() {

    const { error } =
      await supabaseClient.auth.signOut();


    if (error) {

      console.error(
        "Logout Error:",
        error
      );

      return;
    }


    window.location.href = "index.html";

  });


// ==========================================
// START DASHBOARD
// ==========================================

loadDashboard();
