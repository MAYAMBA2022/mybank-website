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

  // User login केलेला नसेल
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Customer information
  const { data: customer, error: customerError } =
    await supabaseClient
      .from("customers")
      .select("*")
      .eq("id", user.id)
      .single();

  if (customerError) {
    console.error(customerError);
    return;
  }

  // Account information
  const { data: accounts, error: accountError } =
    await supabaseClient
      .from("accounts")
      .select("*")
      .eq("customer_id", user.id);

  if (accountError) {
    console.error(accountError);
    return;
  }

  console.log("Customer:", customer);
  console.log("Accounts:", accounts);

  // Example: dashboard मध्ये नाव दाखवणे
  const welcome = document.getElementById("welcomeName");

  if (welcome) {
    welcome.innerText =
      "Welcome, " + customer.full_name;
  }

  // First account
  if (accounts && accounts.length > 0) {

    const account = accounts[0];

    const accountNumber =
      document.getElementById("accountNumber");

    const accountType =
      document.getElementById("accountType");

    const balance =
      document.getElementById("balance");

    if (accountNumber) {
      accountNumber.innerText =
        account.account_number;
    }

    if (accountType) {
      accountType.innerText =
        account.account_type;
    }

    if (balance) {
      balance.innerText =
        "₹" + Number(account.balance).toFixed(2);
    }
  }

  // Load transactions
  await loadTransactions(user.id);
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
