// ==========================================
// MYBANK - SUPABASE CONFIGURATION
// ==========================================

const SUPABASE_URL = "https://ncihofyhnpxrftilejij.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_FDd8fKnlcN8RBqSqovQlIQ_-cx_tZwi";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


// ==========================================
// LOGIN
// login.html
// ==========================================

async function loginUser(email, password) {

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

  if (error) {
    throw error;
  }

  return data;
}


// ==========================================
// REGISTER
// register.html
// ==========================================

async function registerUser(email, password, fullName, mobile, address) {

  // Create authentication user
  const { data, error } =
    await supabaseClient.auth.signUp({
      email: email,
      password: password
    });

  if (error) {
    throw error;
  }

  const user = data.user;

  if (!user) {
    throw new Error("User registration failed.");
  }

  // Save customer information
  const { error: customerError } =
    await supabaseClient
      .from("customers")
      .insert({
        id: user.id,
        full_name: fullName,
        email: email,
        mobile: mobile,
        address: address
      });

  if (customerError) {
    throw customerError;
  }

  return user;
}


// ==========================================
// GET CURRENT USER
// ==========================================

async function getCurrentUser() {

  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}


// ==========================================
// DASHBOARD
// dashboard.html
// ==========================================

async function loadDashboard() {

  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }


  // ==========================================
  // CUSTOMER INFORMATION
  // ==========================================

  const { data: customer, error: customerError } =
    await supabaseClient
      .from("customers")
      .select("*")
      .eq("id", user.id)
      .single();

  if (customerError || !customer) {
    console.error("Customer Error:", customerError);

    const message = document.getElementById("message");

    if (message) {
      message.innerText =
        "Customer information not found.";
    }

    return;
  }


  // Customer name
  const customerName =
    document.getElementById("customerName");

  if (customerName) {
    customerName.innerText =
      customer.full_name;
  }


  // ==========================================
  // ACCOUNT INFORMATION
  // ==========================================

  const { data: accounts, error: accountError } =
    await supabaseClient
      .from("accounts")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", {
        ascending: false
      });


  if (accountError) {
    console.error("Account Error:", accountError);

    const message =
      document.getElementById("message");

    if (message) {
      message.innerText =
        "Account information error: " +
        accountError.message;
    }

    return;
  }


  if (!accounts || accounts.length === 0) {

    const message =
      document.getElementById("message");

    if (message) {
      message.innerText =
        "Account information not found.";
    }

    return;
  }


  console.log("Customer:", customer);
  console.log("Accounts:", accounts);


  // First account
  const account = accounts[0];


  // Account Number
  const accountNumber =
    document.getElementById("accountNumber");

  if (accountNumber) {
    accountNumber.innerText =
      account.account_number;
  }


  // Account Type
  const accountType =
    document.getElementById("accountType");

  if (accountType) {
    accountType.innerText =
      account.account_type;
  }


  // Balance
  const balance =
    document.getElementById("balance");

  if (balance) {
    balance.innerText =
      "₹" +
      Number(account.balance || 0).toFixed(2);
  }


  // ==========================================
  // TRANSACTIONS
  // ==========================================

  await loadTransactions(account.id);
}


// ==========================================
// RECENT TRANSACTIONS
// ==========================================

async function loadTransactions(accountId) {

  const { data, error } =
    await supabaseClient
      .from("transactions")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", {
        ascending: false
      })
      .limit(10);


  if (error) {

    console.error(
      "Transaction Error:",
      error
    );

    const list =
      document.getElementById(
        "transactionList"
      );

    if (list) {
      list.innerHTML =
        `<tr>
          <td colspan="4">
            Transaction information unavailable
          </td>
        </tr>`;
    }

    return;
  }


  console.log("Transactions:", data);


  const list =
    document.getElementById(
      "transactionList"
    );

  if (!list) return;


  list.innerHTML = "";


  if (!data || data.length === 0) {

    list.innerHTML =
      `<tr>
        <td colspan="4">
          No transactions found
        </td>
      </tr>`;

    return;
  }


  data.forEach(transaction => {

    const row =
      document.createElement("tr");


    const type =
      transaction.transaction_type ||
      transaction.type ||
      "";


    const typeClass =
      type === "CREDIT"
        ? "credit"
        : "debit";


    row.innerHTML = `
      <td class="${typeClass}">
        ${type}
      </td>

      <td>
        ₹${Number(
          transaction.amount || 0
        ).toFixed(2)}
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
// RECENT TRANSACTIONS
// ==========================================

async function loadTransactions(userId) {

  const { data, error } =
    await supabaseClient
      .from("transactions")
      .select("*")
      .eq("customer_id", userId)
      .order("created_at", {
        ascending: false
      })
      .limit(10);

  if (error) {
    console.error(error);
    return;
  }

  console.log("Transactions:", data);

  const table =
    document.getElementById("transactions");

  if (!table) return;

  table.innerHTML = "";

  data.forEach(transaction => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${transaction.type || ""}</td>
      <td>₹${Number(transaction.amount || 0).toFixed(2)}</td>
      <td>${transaction.description || ""}</td>
      <td>${transaction.status || ""}</td>
    `;

    table.appendChild(row);
  });
}


// ==========================================
// TRANSFER MONEY
// transfer.html
// ==========================================

async function transferMoney(
  fromAccount,
  toAccount,
  amount,
  description
) {

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Please login first.");
  }

  amount = Number(amount);

  if (!amount || amount <= 0) {
    throw new Error("Enter a valid amount.");
  }

  if (!fromAccount || !toAccount) {
    throw new Error("Account details are required.");
  }

  if (fromAccount === toAccount) {
    throw new Error(
      "Sender and receiver account cannot be same."
    );
  }


  // Get sender account
  const { data: sender, error: senderError } =
    await supabaseClient
      .from("accounts")
      .select("*")
      .eq("account_number", fromAccount)
      .eq("customer_id", user.id)
      .single();

  if (senderError) {
    throw new Error("Sender account not found.");
  }


  // Check balance
  if (Number(sender.balance) < amount) {
    throw new Error("Insufficient balance.");
  }


  // Get receiver account
  const { data: receiver, error: receiverError } =
    await supabaseClient
      .from("accounts")
      .select("*")
      .eq("account_number", toAccount)
      .single();

  if (receiverError) {
    throw new Error("Receiver account not found.");
  }


  // Deduct sender balance
  const newSenderBalance =
    Number(sender.balance) - amount;

  const { error: updateSenderError } =
    await supabaseClient
      .from("accounts")
      .update({
        balance: newSenderBalance
      })
      .eq("id", sender.id);

  if (updateSenderError) {
    throw updateSenderError;
  }


  // Add receiver balance
  const newReceiverBalance =
    Number(receiver.balance) + amount;

  const { error: updateReceiverError } =
    await supabaseClient
      .from("accounts")
      .update({
        balance: newReceiverBalance
      })
      .eq("id", receiver.id);

  if (updateReceiverError) {
    throw updateReceiverError;
  }


  // Save transaction
  const { error: transactionError } =
    await supabaseClient
      .from("transactions")
      .insert({
        customer_id: user.id,
        type: "TRANSFER",
        amount: amount,
        description:
          description ||
          "Money Transfer",
        status: "SUCCESS"
      });

  if (transactionError) {
    throw transactionError;
  }

  return true;
}


// ==========================================
// LOGOUT
// ==========================================

async function logoutUser() {

  const { error } =
    await supabaseClient.auth.signOut();

  if (error) {
    console.error(error);
    return;
  }

  window.location.href = "login.html";
}
