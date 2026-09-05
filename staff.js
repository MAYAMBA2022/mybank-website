// =====================================================
// MYBANK - STAFF BANKING SOFTWARE
// =====================================================

// ================= SUPABASE CONFIG ====================

const SUPABASE_URL =
  "https://ncihofyhnpxrftilejij.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_FDd8fKnlcN8RBqSqovQlIQ_-cx_tZwi";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


// =====================================================
// HELPER
// =====================================================

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function referenceNumber(prefix = "TXN") {
  return prefix +
    Date.now() +
    Math.floor(Math.random() * 1000);
}


// =====================================================
// CUSTOMER / ACCOUNT SEARCH
// =====================================================

async function searchAccount() {

  const accountNumber = val("searchAccountNumber");

  if (!accountNumber) {
    alert("Please enter account number.");
    return;
  }

  try {

    const { data: account, error } =
      await supabaseClient
        .from("accounts")
        .select("*")
        .eq("account_number", accountNumber)
        .single();

    if (error || !account) {
      alert("Account not found.");
      return;
    }

    const { data: customer } =
      await supabaseClient
        .from("customers")
        .select("*")
        .eq("id", account.customer_id)
        .maybeSingle();

    let message =
      "ACCOUNT DETAILS\n\n" +
      "Account Number: " + account.account_number +
      "\nAccount Type: " + (account.account_type || "-") +
      "\nBalance: ₹" + money(account.balance);

    if (customer) {
      message +=
        "\n\nCUSTOMER DETAILS" +
        "\nName: " + (customer.full_name || "-") +
        "\nMobile: " + (customer.mobile || "-") +
        "\nEmail: " + (customer.email || "-") +
        "\nAddress: " + (customer.address || "-");
    }

    alert(message);

    const name = document.getElementById("customerName");
    if (name && customer) {
      name.innerText = customer.full_name || "Customer";
    }

  } catch (error) {

    console.error("Search Error:", error);
    alert("Account search failed.");

  }
}


// =====================================================
// CREATE ACCOUNT
// =====================================================

async function createAccount() {

  const accountType =
    val("accountType");

  const customerId =
    val("customerId");

  const accountNumber =
    val("createAccountNumber");

  if (!accountType) {
    alert("Please select account type.");
    return;
  }

  if (!customerId) {
    alert("Please enter Customer ID.");
    return;
  }

  if (!accountNumber) {
    alert("Please enter Account Number.");
    return;
  }

  try {

    // Check customer
    const { data: customer, error: customerError } =
      await supabaseClient
        .from("customers")
        .select("id, full_name")
        .eq("id", customerId)
        .maybeSingle();

    if (customerError || !customer) {
      alert("Customer ID not found.");
      return;
    }

    // Check duplicate account
    const { data: existing } =
      await supabaseClient
        .from("accounts")
        .select("id")
        .eq("account_number", accountNumber)
        .maybeSingle();

    if (existing) {
      alert("This account number already exists.");
      return;
    }

    // Create account
    const { data: account, error } =
      await supabaseClient
        .from("accounts")
        .insert({
          customer_id: customerId,
          account_number: accountNumber,
          account_type: accountType,
          balance: 0
        })
        .select()
        .single();

    if (error) {
      console.error(error);
      alert("Account creation failed:\n" + error.message);
      return;
    }

    alert(
      "Account Created Successfully!\n\n" +
      "Customer: " + customer.full_name +
      "\nAccount Number: " + account.account_number +
      "\nAccount Type: " + account.account_type
    );

  } catch (error) {

    console.error("Create Account Error:", error);
    alert("Account creation failed.");

  }
}


// =====================================================
// CASH DEPOSIT
// =====================================================

async function depositMoney() {

  try {

    const accountNumber =
      val("depositAccount");

    const amount =
      Number(document.getElementById("depositAmount")?.value);

    const description =
      val("depositDescription") ||
      "Cash Deposit";

    if (!accountNumber) {
      alert("Please enter account number.");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Please enter valid amount.");
      return;
    }

    // Find account
    const { data: account, error: accountError } =
      await supabaseClient
        .from("accounts")
        .select("*")
        .eq("account_number", accountNumber)
        .single();

    if (accountError || !account) {
      alert("Account not found.");
      return;
    }

    const oldBalance =
      Number(account.balance || 0);

    const newBalance =
      oldBalance + amount;

    // Update account
    const { error: updateError } =
      await supabaseClient
        .from("accounts")
        .update({
          balance: newBalance
        })
        .eq("id", account.id);

    if (updateError) {
      console.error(updateError);
      alert("Balance update failed.");
      return;
    }

    // Transaction
    const { error: transactionError } =
      await supabaseClient
        .from("transactions")
        .insert({
          account_id: account.id,
          transaction_type: "CREDIT",
          amount: amount,
          description: description,
          reference_number: referenceNumber("DEP"),
          status: "SUCCESS"
        });

    if (transactionError) {
      console.error(transactionError);
      alert("Transaction save failed.");
      return;
    }

    alert(
      "DEPOSIT SUCCESSFUL\n\n" +
      "Account: " + accountNumber +
      "\nAmount: ₹" + money(amount) +
      "\nNew Balance: ₹" + money(newBalance)
    );

    if (document.getElementById("depositAccount"))
      document.getElementById("depositAccount").value = "";

    if (document.getElementById("depositAmount"))
      document.getElementById("depositAmount").value = "";

    if (document.getElementById("depositDescription"))
      document.getElementById("depositDescription").value = "";

    loadRecentTransactions();

  } catch (error) {

    console.error("Deposit Error:", error);
    alert("Deposit failed.");

  }
}


// =====================================================
// CASH WITHDRAWAL
// =====================================================

async function withdrawMoney() {

  try {

    const accountNumber =
      val("withdrawAccount");

    const amount =
      Number(document.getElementById("withdrawAmount")?.value);

    const description =
      val("withdrawDescription") ||
      "Cash Withdrawal";

    if (!accountNumber) {
      alert("Please enter account number.");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Please enter valid amount.");
      return;
    }

    // Find account
    const { data: account, error: accountError } =
      await supabaseClient
        .from("accounts")
        .select("*")
        .eq("account_number", accountNumber)
        .single();

    if (accountError || !account) {
      alert("Account not found.");
      return;
    }

    const currentBalance =
      Number(account.balance || 0);

    if (currentBalance < amount) {

      alert(
        "INSUFFICIENT BALANCE\n\n" +
        "Available Balance: ₹" +
        money(currentBalance)
      );

      return;
    }

    const newBalance =
      currentBalance - amount;

    // Update balance
    const { error: updateError } =
      await supabaseClient
        .from("accounts")
        .update({
          balance: newBalance
        })
        .eq("id", account.id);

    if (updateError) {
      console.error(updateError);
      alert("Balance update failed.");
      return;
    }

    // Save transaction
    const { error: transactionError } =
      await supabaseClient
        .from("transactions")
        .insert({
          account_id: account.id,
          transaction_type: "DEBIT",
          amount: amount,
          description: description,
          reference_number: referenceNumber("WDL"),
          status: "SUCCESS"
        });

    if (transactionError) {
      console.error(transactionError);
      alert("Transaction save failed.");
      return;
    }

    alert(
      "WITHDRAWAL SUCCESSFUL\n\n" +
      "Account: " + accountNumber +
      "\nAmount: ₹" + money(amount) +
      "\nRemaining Balance: ₹" + money(newBalance)
    );

    if (document.getElementById("withdrawAccount"))
      document.getElementById("withdrawAccount").value = "";

    if (document.getElementById("withdrawAmount"))
      document.getElementById("withdrawAmount").value = "";

    if (document.getElementById("withdrawDescription"))
      document.getElementById("withdrawDescription").value = "";

    loadRecentTransactions();

  } catch (error) {

    console.error("Withdrawal Error:", error);
    alert("Withdrawal failed.");

  }
}


// =====================================================
// MONEY TRANSFER
// =====================================================

async function transferMoney() {

  try {

    const fromAccountNumber =
      val("fromAccountNumber");

    const toAccountNumber =
      val("toAccountNumber");

    const amount =
      Number(document.getElementById("transferAmount")?.value);

    if (!fromAccountNumber) {
      alert("Please enter From Account Number.");
      return;
    }

    if (!toAccountNumber) {
      alert("Please enter To Account Number.");
      return;
    }

    if (fromAccountNumber === toAccountNumber) {
      alert("From and To account cannot be same.");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Please enter valid amount.");
      return;
    }

    // From account
    const { data: fromAccount, error: fromError } =
      await supabaseClient
        .from("accounts")
        .select("*")
        .eq("account_number", fromAccountNumber)
        .single();

    if (fromError || !fromAccount) {
      alert("From account not found.");
      return;
    }

    // To account
    const { data: toAccount, error: toError } =
      await supabaseClient
        .from("accounts")
        .select("*")
        .eq("account_number", toAccountNumber)
        .single();

    if (toError || !toAccount) {
      alert("To account not found.");
      return;
    }

    const fromBalance =
      Number(fromAccount.balance || 0);

    if (fromBalance < amount) {
      alert(
        "Insufficient Balance!\n\n" +
        "Available: ₹" + money(fromBalance)
      );
      return;
    }

    const newFromBalance =
      fromBalance - amount;

    const newToBalance =
      Number(toAccount.balance || 0) + amount;

    // Debit sender
    const { error: debitError } =
      await supabaseClient
        .from("accounts")
        .update({
          balance: newFromBalance
        })
        .eq("id", fromAccount.id);

    if (debitError) {
      console.error(debitError);
      alert("Transfer failed.");
      return;
    }

    // Credit receiver
    const { error: creditError } =
      await supabaseClient
        .from("accounts")
        .update({
          balance: newToBalance
        })
        .eq("id", toAccount.id);

    if (creditError) {
      console.error(creditError);

      // Roll back sender
      await supabaseClient
        .from("accounts")
        .update({
          balance: fromBalance
        })
        .eq("id", fromAccount.id);

      alert("Transfer failed.");
      return;
    }

    const ref =
      referenceNumber("TRF");

    // Debit transaction
    await supabaseClient
      .from("transactions")
      .insert({
        account_id: fromAccount.id,
        transaction_type: "DEBIT",
        amount: amount,
        description:
          "Transfer to " + toAccountNumber,
        reference_number: ref,
        status: "SUCCESS"
      });

    // Credit transaction
    await supabaseClient
      .from("transactions")
      .insert({
        account_id: toAccount.id,
        transaction_type: "CREDIT",
        amount: amount,
        description:
          "Transfer from " + fromAccountNumber,
        reference_number: ref,
        status: "SUCCESS"
      });

    alert(
      "TRANSFER SUCCESSFUL\n\n" +
      "From: " + fromAccountNumber +
      "\nTo: " + toAccountNumber +
      "\nAmount: ₹" + money(amount) +
      "\nReference: " + ref
    );

    loadRecentTransactions();

  } catch (error) {

    console.error("Transfer Error:", error);
    alert("Transfer failed.");

  }
}


// =====================================================
// RECENT TRANSACTIONS
// =====================================================

async function loadRecentTransactions() {

  const table =
    document.getElementById("transactionList");

  if (!table) return;

  const { data: transactions, error } =
    await supabaseClient
      .from("transactions")
      .select(`
        *,
        accounts (
          account_number
        )
      `)
      .order("created_at", {
        ascending: false
      })
      .limit(20);

  if (error) {
    console.error(error);
    return;
  }

  table.innerHTML = "";

  if (!transactions || transactions.length === 0) {

    table.innerHTML =
      `<tr>
        <td colspan="6">No transactions found</td>
      </tr>`;

    return;
  }

  transactions.forEach(function(transaction) {

    const row =
      document.createElement("tr");

    const type =
      transaction.transaction_type || "-";

    const typeClass =
      type === "CREDIT" ? "credit" : "debit";

    row.innerHTML = `
      <td>
        ${transaction.accounts?.account_number || "-"}
      </td>

      <td class="${typeClass}">
        ${type}
      </td>

      <td>
        ₹${money(transaction.amount)}
      </td>

      <td>
        ${transaction.description || "-"}
      </td>

      <td>
        ${transaction.reference_number || "-"}
      </td>

      <td>
        ${transaction.status || "-"}
      </td>
    `;

    table.appendChild(row);

  });
}


// =====================================================
// PIGMY ACCOUNT - CREATE
// =====================================================

async function createPigmyAccount() {

  const customerId =
    val("pigmyCustomerId");

  const agentId =
    val("pigmyAgentId");

  const accountNumber =
    val("pigmyAccountNumber");

  if (!customerId) {
    alert("Please enter Customer ID.");
    return;
  }

  if (!agentId) {
    alert("Please enter Pigmy Agent ID.");
    return;
  }

  if (!accountNumber) {
    alert("Please enter Pigmy Account Number.");
    return;
  }

  const { data, error } =
    await supabaseClient
      .from("pigmy_accounts")
      .insert({
        customer_id: customerId,
        agent_id: agentId,
        account_number: accountNumber,
        balance: 0,
        status: "ACTIVE"
      })
      .select()
      .single();

  if (error) {

    console.error(error);
    alert(
      "Pigmy Account creation failed:\n" +
      error.message
    );

    return;
  }

  alert(
    "Pigmy Account Created!\n\n" +
    "Account Number: " +
    data.account_number
  );
}


// =====================================================
// PIGMY COLLECTION
// =====================================================

async function collectPigmy() {

  const accountNumber =
    val("pigmyCollectionAccount");

  const agentId =
    val("pigmyCollectionAgent");

  const amount =
    Number(
      document.getElementById(
        "pigmyCollectionAmount"
      )?.value
    );

  if (!accountNumber || !agentId) {
    alert("Please enter Pigmy Account and Agent ID.");
    return;
  }

  if (!amount || amount <= 0) {
    alert("Please enter valid amount.");
    return;
  }

  const { data: account, error } =
    await supabaseClient
      .from("pigmy_accounts")
      .select("*")
      .eq("account_number", accountNumber)
      .single();

  if (error || !account) {
    alert("Pigmy account not found.");
    return;
  }

  const newBalance =
    Number(account.balance || 0) + amount;

  const { error: updateError } =
    await supabaseClient
      .from("pigmy_accounts")
      .update({
        balance: newBalance
      })
      .eq("id", account.id);

  if (updateError) {
    alert("Pigmy balance update failed.");
    return;
  }

  const { error: collectionError } =
    await supabaseClient
      .from("pigmy_collections")
      .insert({
        pigmy_account_id: account.id,
        agent_id: agentId,
        amount: amount,
        collection_date: new Date().toISOString()
      });

  if (collectionError) {
    console.error(collectionError);
    alert("Collection record failed.");
    return;
  }

  alert(
    "PIGMY COLLECTION SUCCESSFUL\n\n" +
    "Account: " + accountNumber +
    "\nAmount: ₹" + money(amount) +
    "\nBalance: ₹" + money(newBalance)
  );
}


// =====================================================
// LOAD PIGMY AGENTS
// =====================================================

async function loadPigmyAgents() {

  const select =
    document.getElementById("pigmyAgentId");

  if (!select) return;

  const { data, error } =
    await supabaseClient
      .from("pigmy_agents")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error("Pigmy Agent Error:", error);
    return;
  }

  select.innerHTML =
    `<option value="">Select Pigmy Agent</option>`;

  (data || []).forEach(function(agent) {

    const option =
      document.createElement("option");

    option.value = agent.id;

    option.textContent =
      agent.agent_name ||
      agent.name ||
      agent.agent_code ||
      agent.id;

    select.appendChild(option);

  });
}


// =====================================================
// LOAD LOAN TYPES
// =====================================================

async function loadLoanTypes() {

  const select =
    document.getElementById("loanType");

  if (!select) return;

  const { data, error } =
    await supabaseClient
      .from("loan_types")
      .select("*")
      .order("created_at", {
        ascending: true
      });

  if (error) {
    console.error("Loan Type Error:", error);
    return;
  }

  select.innerHTML =
    `<option value="">Select Loan Type</option>`;

  (data || []).forEach(function(type) {

    const option =
      document.createElement("option");

    option.value = type.id;

    option.textContent =
      type.name ||
      type.loan_name ||
      type.type_name ||
      "Loan Type";

    select.appendChild(option);

  });
}


// =====================================================
// CREATE LOAN
// =====================================================

async function createLoan() {

  const customerId =
    val("loanCustomerId");

  const accountNumber =
    val("loanAccountNumber");

  const loanType =
    val("loanType");

  const amount =
    Number(
      document.getElementById("loanAmount")?.value
    );

  const interestRate =
    Number(
      document.getElementById("loanInterest")?.value
    ) || 0;

  if (!customerId) {
    alert("Please enter Customer ID.");
    return;
  }

  if (!accountNumber) {
    alert("Please enter Account Number.");
    return;
  }

  if (!loanType) {
    alert("Please select Loan Type.");
    return;
  }

  if (!amount || amount <= 0) {
    alert("Please enter valid loan amount.");
    return;
  }

  try {

    const { data: loan, error } =
      await supabaseClient
        .from("loans")
        .insert({
          customer_id: customerId,
          account_id: accountNumber,
          loan_type_id: loanType,
          principal_amount: amount,
          interest_rate: interestRate,
          outstanding_amount: amount,
          status: "PENDING"
        })
        .select()
        .single();

    if (error) {
      console.error(error);
      alert(
        "Loan creation failed:\n" +
        error.message
      );
      return;
    }

    alert(
      "LOAN CREATED SUCCESSFULLY\n\n" +
      "Loan ID: " + loan.id +
      "\nAmount: ₹" + money(amount) +
      "\nStatus: PENDING"
    );

  } catch (error) {

    console.error(error);
    alert("Loan creation failed.");

  }
}


// =====================================================
// LOAN REPAYMENT
// =====================================================

async function loanRepayment() {

  const loanId =
    val("repaymentLoanId");

  const amount =
    Number(
      document.getElementById(
        "repaymentAmount"
      )?.value
    );

  if (!loanId) {
    alert("Please enter Loan ID.");
    return;
  }

  if (!amount || amount <= 0) {
    alert("Please enter valid repayment amount.");
    return;
  }

  const { data: loan, error } =
    await supabaseClient
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

  if (error || !loan) {
    alert("Loan not found.");
    return;
  }

  const outstanding =
    Number(
      loan.outstanding_amount ??
      loan.remaining_amount ??
      loan.principal_amount ??
      0
    );

  if (amount > outstanding) {
    alert(
      "Repayment cannot be greater than outstanding amount.\n\n" +
      "Outstanding: ₹" + money(outstanding)
    );
    return;
  }

  const remaining =
    outstanding - amount;

  const newStatus =
    remaining <= 0
      ? "CLOSED"
      : "ACTIVE";

  const { error: updateError } =
    await supabaseClient
      .from("loans")
      .update({
        outstanding_amount: remaining,
        status: newStatus
      })
      .eq("id", loanId);

  if (updateError) {
    console.error(updateError);
    alert("Loan update failed.");
    return;
  }

  const { error: repaymentError } =
    await supabaseClient
      .from("loan_repayments")
      .insert({
        loan_id: loanId,
        amount: amount,
        payment_date: new Date().toISOString(),
        status: "SUCCESS"
      });

  if (repaymentError) {
    console.error(repaymentError);
    alert("Repayment record failed.");
    return;
  }

  alert(
    "LOAN REPAYMENT SUCCESSFUL\n\n" +
    "Loan ID: " + loanId +
    "\nPaid: ₹" + money(amount) +
    "\nRemaining: ₹" + money(remaining) +
    "\nStatus: " + newStatus
  );
}


// =====================================================
// LOGOUT
// =====================================================

async function logoutStaff() {

  const { error } =
    await supabaseClient.auth.signOut();

  if (error) {
    console.error("Logout Error:", error);
    alert("Logout failed.");
    return;
  }

  window.location.href = "index.html";
}


// =====================================================
// BUTTON EVENTS
// =====================================================

document.addEventListener("DOMContentLoaded", function() {

  const searchBtn =
    document.getElementById("searchAccountBtn");

  if (searchBtn) {
    searchBtn.addEventListener(
      "click",
      searchAccount
    );
  }


  const depositBtn =
    document.getElementById("depositBtn");

  if (depositBtn) {
    depositBtn.addEventListener(
      "click",
      depositMoney
    );
  }


  const withdrawBtn =
    document.getElementById("withdrawBtn");

  if (withdrawBtn) {
    withdrawBtn.addEventListener(
      "click",
      withdrawMoney
    );
  }


  const transferBtn =
    document.getElementById("transferBtn");

  if (transferBtn) {
    transferBtn.addEventListener(
      "click",
      transferMoney
    );
  }


  const createAccountBtn =
    document.getElementById("createAccountBtn");

  if (createAccountBtn) {
    createAccountBtn.addEventListener(
      "click",
      createAccount
    );
  }


  const createPigmyBtn =
    document.getElementById("createPigmyBtn");

  if (createPigmyBtn) {
    createPigmyBtn.addEventListener(
      "click",
      createPigmyAccount
    );
  }


  const pigmyCollectionBtn =
    document.getElementById(
      "pigmyCollectionBtn"
    );

  if (pigmyCollectionBtn) {
    pigmyCollectionBtn.addEventListener(
      "click",
      collectPigmy
    );
  }


  const createLoanBtn =
    document.getElementById("createLoanBtn");

  if (createLoanBtn) {
    createLoanBtn.addEventListener(
      "click",
      createLoan
    );
  }


  const repaymentBtn =
    document.getElementById("repaymentBtn");

  if (repaymentBtn) {
    repaymentBtn.addEventListener(
      "click",
      loanRepayment
    );
  }


  const logoutBtn =
    document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener(
      "click",
      logoutStaff
    );
  }


  // Load data
  loadRecentTransactions();
  loadPigmyAgents();
  loadLoanTypes();

});
