
function calculatePaymentPlan() {
  const planSelect = document.getElementById('paymentPlanSelect');
  const schemeSelect = document.getElementById('paymentSchemeSelect');
  const breakdownDiv = document.getElementById('paymentBreakdown');
  const breakdownDetails = document.getElementById('breakdownDetails');

  if (!planSelect.value) {
    breakdownDiv.classList.add('hidden');
    return;
  }

  if (!schemeSelect.value) {
    alert('Please select a payment scheme first');
    planSelect.value = '';
    return;
  }

  const schemeId = schemeSelect.value;
  const schemeData = window.schemeDataCache[schemeId];

  if (!schemeData) {
    alert('Payment scheme data not available');
    return;
  }

  const {
    totalComLabFee = 0,
    totalLabFee = 0,
    totalCLFee = 0,
    totalCFee = 0,
    totalTuitionFee = 0,
    totalNSTPFee = 0
  } = schemeData;

  const regularTotal = parseFloat(schemeData.regular_fees) || 0;
  const miscTotal = parseFloat(schemeData.misc_fees) || 0;
  const affTotal = parseFloat(schemeData.aff_fee) || 0;

  const totalFees = regularTotal + miscTotal + totalComLabFee + totalLabFee +
                    totalCLFee + totalCFee + affTotal + totalTuitionFee + totalNSTPFee;

  let breakdownHTML = '';

  switch (planSelect.value) {
    case 'cash': {
      const discount = totalFees * 0.05;
      const cashTotal = totalFees - discount;
      breakdownHTML = `
        <div class="space-y-2">
          <p><strong>Total Fees:</strong> ₱${totalFees.toFixed(2)}</p>
          <p class="text-green-600">5% Discount: -₱${discount.toFixed(2)}</p>
          <p class="font-bold">Amount to Pay: ₱${cashTotal.toFixed(2)}</p>
        </div>
      `;
      break;
    }

    case 'planA': {
      const downpaymentA = 500;
      const remainingA = totalFees - downpaymentA;
      breakdownHTML = `
        <div class="space-y-2">
          <p><strong>Total Fees:</strong> ₱${totalFees.toFixed(2)}</p>
          <p>Downpayment: ₱${downpaymentA.toFixed(2)}</p>
          <p>Remaining Balance: ₱${remainingA.toFixed(2)}</p>
        </div>
      `;
      break;
    }

    case 'planB': {
      const downpaymentB = regularTotal + miscTotal;
      const remainingB = totalFees - downpaymentB;
      const monthlyB = remainingB / 4;
      breakdownHTML = `
        <div class="space-y-2">
          <p><strong>Total Fees:</strong> ₱${totalFees.toFixed(2)}</p>
          <p>Registration Fees: ₱${regularTotal.toFixed(2)}</p>
          <p>Miscellaneous Fees: ₱${miscTotal.toFixed(2)}</p>
          <p class="font-semibold">Downpayment (Reg + Misc): ₱${downpaymentB.toFixed(2)}</p>
          <p>Remaining Balance: ₱${remainingB.toFixed(2)}</p>
          <p>4 Monthly Payments: ₱${monthlyB.toFixed(2)} each</p>
        </div>
      `;
      break;
    }
  }

  breakdownDetails.innerHTML = breakdownHTML;
  breakdownDiv.classList.remove('hidden');
}


// Call this when the page loads
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();

  fetchPendingApprovals(); // Add this line
});

function closeBatchModal() {
  document.getElementById('batchModal').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

// Payment Scheme Scripts

// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  loadPaymentSchemes();
});

// Modal functions
function openCreateModal() {
  document.getElementById('createModal').classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeCreateModal() {
  document.getElementById('createModal').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  document.getElementById('schemeForm').reset();
  resetFeeContainers();
}

// Fee item management
function addRegularFee() {
  const container = document.getElementById('regular-fees-container');
  addFeeItem(container, 'regular_fees[]', 'regular_amounts[]', 'calculateRegularTotal');
}

function addMiscFee() {
  const container = document.getElementById('misc-fees-container');
  addFeeItem(container, 'misc_fees[]', 'misc_amounts[]', 'calculateMiscTotal');
}

function addFeeItem(container, namePrefix, amountPrefix, calculateFunction) {
  const div = document.createElement('div');
  div.className = 'flex items-center gap-3';
  div.innerHTML = `
    <input type="text" name="${namePrefix}" placeholder="Fee description"
           class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
    <input type="number" name="${amountPrefix}" placeholder="Amount"
           class="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
           oninput="${calculateFunction}()">
    <button type="button" onclick="removeFeeItem(this)" class="text-red-500 hover:text-red-700">
      <i data-lucide="trash-2"></i>
    </button>
  `;
  container.appendChild(div);
  lucide.createIcons();
}

function removeFeeItem(button) {
  button.closest('div').remove();
  calculateRegularTotal();
  calculateMiscTotal();
}

function resetFeeContainers() {
  document.getElementById('regular-fees-container').innerHTML = `
    <div class="flex items-center gap-3">
      <input type="text" name="regular_fees[]" placeholder="Fee description"
             class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
      <input type="number" name="regular_amounts[]" placeholder="Amount"
             class="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
             oninput="calculateRegularTotal()">
      <button type="button" onclick="removeFeeItem(this)" class="text-red-500 hover:text-red-700">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  `;

  document.getElementById('misc-fees-container').innerHTML = `
    <div class="flex items-center gap-3">
      <input type="text" name="misc_fees[]" placeholder="Fee description"
             class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
      <input type="number" name="misc_amounts[]" placeholder="Amount"
             class="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
             oninput="calculateMiscTotal()">
      <button type="button" onclick="removeFeeItem(this)" class="text-red-500 hover:text-red-700">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  `;

  document.getElementById('regular-total').textContent = '0';
  document.getElementById('misc-total').textContent = '0';
  lucide.createIcons();
}

// Calculation functions
function calculateRegularTotal() {
  const amounts = document.getElementsByName('regular_amounts[]');
  let total = 0;
  amounts.forEach(input => {
    total += parseFloat(input.value) || 0;
  });
  document.getElementById('regular-total').textContent = total.toFixed(2);
}

function calculateMiscTotal() {
  const amounts = document.getElementsByName('misc_amounts[]');
  let total = 0;
  amounts.forEach(input => {
    total += parseFloat(input.value) || 0;
  });
  document.getElementById('misc-total').textContent = total.toFixed(2);
}

// Form submission
document.getElementById('schemeForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Collect all form data
  const formData = {
    payment_name: document.getElementById('payment_name').value,
    regular_fees: [],
    misc_fees: [],
    com_lab_fee: document.getElementById('com_lab_fee').value,
    laboratory_fee: document.getElementById('laboratory_fee').value,
    school_lecture_fee: document.getElementById('school_lecture_fee').value,
    clinic_fee: document.getElementById('clinic_fee').value,
    aff_fee: document.getElementById('aff_fee').value,
    tuition_fee: document.getElementById('tuition_fee').value,
    unit_fee: document.getElementById('unit_fee').value
  };

  // Collect regular fees
  const regularNames = document.getElementsByName('regular_fees[]');
  const regularAmounts = document.getElementsByName('regular_amounts[]');
  for (let i = 0; i < regularNames.length; i++) {
    if (regularNames[i].value && regularAmounts[i].value) {
      formData.regular_fees.push({
        description: regularNames[i].value,
        amount: regularAmounts[i].value
      });
    }
  }

  // Collect misc fees
  const miscNames = document.getElementsByName('misc_fees[]');
  const miscAmounts = document.getElementsByName('misc_amounts[]');
  for (let i = 0; i < miscNames.length; i++) {
    if (miscNames[i].value && miscAmounts[i].value) {
      formData.misc_fees.push({
        description: miscNames[i].value,
        amount: miscAmounts[i].value
      });
    }
  }

  try {
    const response = await fetch('/payment-schemes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error('Failed to save payment scheme');
    }

    const result = await response.json();
    alert('Payment scheme created successfully!');
    closeCreateModal();
    loadPaymentSchemes();
  } catch (error) {
    console.error('Error:', error);
    alert('Error creating payment scheme: ' + error.message);
  }
});

async function loadPaymentSchemes() {
  const container = document.getElementById('schemes-container');
  container.innerHTML = '<div class=" p-4 text-center text-gray-500">Loading payment schemes...</div>';

  try {
    const response = await fetch('/payment-schemes');
    if (!response.ok) {
      throw new Error('Failed to fetch payment schemes');
    }

    const schemes = await response.json();

    if (schemes.length === 0) {
      container.innerHTML = '<div class=" p-4 text-center text-gray-500">No payment schemes found</div>';
      return;
    }

    container.innerHTML = '';
    schemes.forEach(scheme => {
      const schemeElement = document.createElement('div');
      schemeElement.className = ' p-4 hover:bg-gray-50';
      schemeElement.innerHTML = `
        <div class="flex flex-col h-full">
          <div class="flex-grow">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-medium text-lg text-gray-800">${scheme.payment_name}</h3>
                <div class="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div>
                    <span class="text-gray-500">Registration:</span>
                    <span class="font-medium">₱${scheme.regular_fees}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">Misc:</span>
                    <span class="font-medium">₱${scheme.misc_fees}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">Com Lab Fees:</span>
                    <span class="font-medium">₱${scheme.com_lab_fee}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">Laboratory Fees:</span>
                    <span class="font-medium">₱${scheme.laboratory_fee}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">CL Fees:</span>
                    <span class="font-medium">₱${scheme.school_lecture_fee}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">C Fees:</span>
                    <span class="font-medium">₱${scheme.clinic_fee}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">Lab Fees:</span>
                    <span class="font-medium">₱${scheme.lab_fees}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">RLE Fees:</span>
                    <span class="font-medium">₱${scheme.rle_fees}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">Affiliation:</span>
                    <span class="font-medium">₱${scheme.aff_fee}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">Tuition/Unit:</span>
                    <span class="font-medium">₱${scheme.tuition_fee}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">NSTP/Unit:</span>
                    <span class="font-medium">₱${scheme.unit_fee}</span>
                  </div>
                </div>
              </div>
              <div class="flex gap-2">
                <button onclick="editScheme('${scheme.id}')" class="text-blue-600 hover:text-blue-800" data-lucide="pencil">
                  <span class="sr-only">Edit</span>
                </button>
                <button onclick="deleteScheme('${scheme.id}')" class="text-red-600 hover:text-red-800" data-lucide="trash-2">
                  <span class="sr-only">Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(schemeElement);
    });


    // Refresh icons after all schemes are added
    lucide.createIcons();
  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = '<div class=" p-4 text-center text-red-500">Error loading payment schemes</div>';
  }
}

async function editScheme(schemeId) {
  try {
    const response = await fetch(`/payment-schemes/${schemeId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch scheme');
    }

    const scheme = await response.json();

    // Populate the edit form
    document.getElementById('edit_scheme_id').value = scheme.id;
    document.getElementById('edit_payment_name').value = scheme.payment_name;
    document.getElementById('edit_com_lab_fee').value = scheme.com_lab_fee;
    document.getElementById('edit_laboratory_fee').value = scheme.laboratory_fee;
    document.getElementById('edit_school_lecture_fee').value = scheme.school_lecture_fee;
    document.getElementById('edit_clinic_fee').value = scheme.clinic_fee;
    document.getElementById('edit_aff_fee').value = scheme.aff_fee;
    document.getElementById('edit_tuition_fee').value = scheme.tuition_fee;

    // Clear and populate regular fees
    resetEditFeeContainers();
    if (scheme.regular_fees && scheme.regular_fees.length > 0) {
      scheme.regular_fees.forEach(fee => {
        addEditRegularFee(fee.description, fee.amount);
      });
    } else {
      addEditRegularFee(); // Add one empty row
    }

    // Clear and populate misc fees
    if (scheme.misc_fees && scheme.misc_fees.length > 0) {
      scheme.misc_fees.forEach(fee => {
        addEditMiscFee(fee.description, fee.amount);
      });
    } else {
      addEditMiscFee(); // Add one empty row
    }

    // Calculate totals
    calculateEditRegularTotal();
    calculateEditMiscTotal();

    // Open the modal
    openEditModal();
  } catch (error) {
    console.error('Error:', error);
    alert('Error loading scheme for editing');
  }
}

async function deleteScheme(schemeId) {
  if (!confirm('Are you sure you want to delete this payment scheme?')) {
    return;
  }

  try {
    const response = await fetch(`/payment-schemes/${schemeId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete scheme');
    }

    alert('Payment scheme deleted successfully');
    loadPaymentSchemes();
  } catch (error) {
    console.error('Error:', error);
    alert('Error deleting payment scheme');
  }
}

// Edit Modal functions
function openEditModal() {
  document.getElementById('editModal').classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  document.getElementById('editSchemeForm').reset();
  resetEditFeeContainers();
}

function resetEditFeeContainers() {
  document.getElementById('edit-regular-fees-container').innerHTML = '';
  document.getElementById('edit-misc-fees-container').innerHTML = '';
  document.getElementById('edit-regular-total').textContent = '0';
  document.getElementById('edit-misc-total').textContent = '0';
}

// Edit fee item management
function addEditRegularFee(description = '', amount = '') {
  const container = document.getElementById('edit-regular-fees-container');
  addEditFeeItem(container, 'edit_regular_fees[]', 'edit_regular_amounts[]', 'calculateEditRegularTotal', description, amount);
}

function addEditMiscFee(description = '', amount = '') {
  const container = document.getElementById('edit-misc-fees-container');
  addEditFeeItem(container, 'edit_misc_fees[]', 'edit_misc_amounts[]', 'calculateEditMiscTotal', description, amount);
}

function addEditFeeItem(container, namePrefix, amountPrefix, calculateFunction, description = '', amount = '') {
  const div = document.createElement('div');
  div.className = 'flex items-center gap-3';
  div.innerHTML = `
    <input type="text" name="${namePrefix}" placeholder="Fee description" value="${description}"
           class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
    <input type="number" name="${amountPrefix}" placeholder="Amount" value="${amount}"
           class="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
           oninput="${calculateFunction}()">
    <button type="button" onclick="removeEditFeeItem(this)" class="text-red-500 hover:text-red-700">
      <i data-lucide="trash-2"></i>
    </button>
  `;
  container.appendChild(div);
  lucide.createIcons();
}

function removeEditFeeItem(button) {
  button.closest('div').remove();
  calculateEditRegularTotal();
  calculateEditMiscTotal();
}

// Edit calculation functions
function calculateEditRegularTotal() {
  const amounts = document.getElementsByName('edit_regular_amounts[]');
  let total = 0;
  amounts.forEach(input => {
    total += parseFloat(input.value) || 0;
  });
  document.getElementById('edit-regular-total').textContent = total.toFixed(2);
}

function calculateEditMiscTotal() {
  const amounts = document.getElementsByName('edit_misc_amounts[]');
  let total = 0;
  amounts.forEach(input => {
    total += parseFloat(input.value) || 0;
  });
  document.getElementById('edit-misc-total').textContent = total.toFixed(2);
}

// Fetch assigned payments
function fetchAssignedPayments() {
  fetch('/get_assigned_payments')
    .then(res => res.json())
    .then(data => {
      const tableBody = document.getElementById('assignedTableBody');
      tableBody.innerHTML = '';

      if (data.success && data.assigned_payments.length > 0) {
        data.assigned_payments.forEach(payment => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td class="p-3">${payment.department}</td>
            <td class="p-3">${payment.program_name}</td>
            <td class="p-3">${payment.submitted_by}</td>
            <td class="p-3 text-center">${payment.subject_count}</td>
            <td class="p-3">${payment.year_semester}</td>
            <td class="p-3">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Processed
              </span>
            </td>
            <td class="p-3 text-right">
              <button onclick="viewPaymentDetails(${payment.id})" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors">
                View Details
              </button>
            </td>
          `;
          tableBody.appendChild(row);
        });
      } else {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="py-8 text-center text-gray-500">
              No subjects have been processed yet.
            </td>
          </tr>
        `;
      }
    })
    .catch(error => {
      console.error('Error fetching assigned payments:', error);
    });
}

function viewPaymentDetails(batchId) {
  fetch(`/get_assigned_payment_details/${batchId}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const modal = document.getElementById('paymentDetailsModal');
        const content = document.getElementById('paymentDetailsContent');

        // Extract the payment details
        const payment = data.payment_details;
        const scheme = payment.payment_scheme;
        const plan = payment.payment_plan;
        const subjects = payment.subjects;

        // Calculate totals from subjects
        let totalComLabUnits = 0;
        let totalLabUnits = 0;
        let totalCLUnits = 0;
        let totalCUnits = 0;
        let tuitionUnits = 0;
        let nstpUnits = 0;
        let totalUnits = 0;

        // Create subject details table
        let subjectTableHTML = `
          <h3 class="text-lg font-semibold mb-4">Subject Details</h3>
          <table class="w-full text-sm border mb-6">
            <thead class="bg-gray-100">
              <tr>
                <th class="p-2 border text-left">Code</th>
                <th class="p-2 border text-left">Name</th>
                <th class="p-2 border text-center">Units</th>
                <th class="p-2 border text-center">Lec</th>
                <th class="p-2 border text-center">CLab</th>
                <th class="p-2 border text-center">Lab</th>
                <th class="p-2 border text-center">SL</th>
                <th class="p-2 border text-center">C</th>
                <th class="p-2 border text-center">Type</th>
              </tr>
            </thead>
            <tbody>
        `;

        subjects.forEach(subj => {
          totalComLabUnits += subj.com_lab || 0;
          totalLabUnits += subj.laboratory || 0;
          totalCLUnits += subj.school_lecture || 0;
          totalCUnits += subj.clinic || 0;
          totalUnits += subj.total_units || 0;

          if (subj.is_nstp) {
            nstpUnits += subj.total_units || 0;
          } else {
            tuitionUnits += subj.total_units || 0;
          }

          subjectTableHTML += `
            <tr class="border-b">
              <td class="p-2 border">${subj.subject_code}</td>
              <td class="p-2 border">${subj.subject_name}</td>
              <td class="p-2 border text-center">${subj.total_units}</td>
              <td class="p-2 border text-center">${subj.lecture}</td>
              <td class="p-2 border text-center">${subj.com_lab}</td>
              <td class="p-2 border text-center">${subj.laboratory}</td>
              <td class="p-2 border text-center">${subj.school_lecture}</td>
              <td class="p-2 border text-center">${subj.clinic}</td>
              <td class="p-2 border text-center">${subj.subject_type} ${subj.is_nstp ? '(NSTP)' : ''}</td>
            </tr>
          `;
        });

        subjectTableHTML += `
              <tr class="bg-gray-100 font-medium">
                <td colspan="2" class="p-2 border text-right">Total</td>
                <td class="p-2 border text-center">${totalUnits}</td>
                <td class="p-2 border text-center"></td>
                <td class="p-2 border text-center">${totalComLabUnits}</td>
                <td class="p-2 border text-center">${totalLabUnits}</td>
                <td class="p-2 border text-center">${totalCLUnits}</td>
                <td class="p-2 border text-center">${totalCUnits}</td>
                <td class="p-2 border text-center"></td>
              </tr>
            </tbody>
          </table>
        `;

        // Calculate fees based on scheme
        const regularTotal = parseFloat(scheme.regular_fees) || 0;
        const miscTotal = parseFloat(scheme.misc_fees) || 0;
        const affTotal = parseFloat(scheme.aff_fee) || 0;

        const totalComLabFee = totalComLabUnits * (parseFloat(scheme.com_lab_fee) || 0);
        const totalLabFee = totalLabUnits * (parseFloat(scheme.laboratory_fee) || 0);
        const totalCLFee = totalCLUnits * (parseFloat(scheme.school_lecture_fee) || 0);
        const totalCFee = totalCUnits * (parseFloat(scheme.clinic_fee) || 0);
        const totalTuitionFee = tuitionUnits * (parseFloat(scheme.tuition_fee) || 0);
        const totalNSTPFee = nstpUnits * (parseFloat(scheme.unit_fee) || 0);

        const subtotal = regularTotal + miscTotal + totalComLabFee + totalLabFee +
                         totalCLFee + totalCFee + affTotal + totalTuitionFee + totalNSTPFee;

        // Calculate payment plan breakdown
        let breakdownHTML = '';
        let totalToPay = subtotal;

        switch (plan) {
          case 'cash':
            const discount = subtotal * 0.05;
            totalToPay = subtotal - discount;
            breakdownHTML = `
              <div class="space-y-2">
                <div class="flex justify-between"><span>Subtotal:</span><span>₱${subtotal.toFixed(2)}</span></div>
                <div class="flex justify-between text-green-600"><span>5% Discount:</span><span>-₱${discount.toFixed(2)}</span></div>
                <div class="flex justify-between font-bold border-t pt-2 mt-2"><span>Total Amount Due:</span><span>₱${totalToPay.toFixed(2)}</span></div>
              </div>
            `;
            break;

          case 'planA':
            const downpaymentA = 500;
            const remainingA = subtotal - downpaymentA;
            totalToPay = subtotal;
            breakdownHTML = `
              <div class="space-y-2">
                <div class="flex justify-between"><span>Subtotal:</span><span>₱${subtotal.toFixed(2)}</span></div>
                <div class="flex justify-between"><span>Downpayment:</span><span>₱${downpaymentA.toFixed(2)}</span></div>
                <div class="flex justify-between"><span>Remaining Balance:</span><span>₱${remainingA.toFixed(2)}</span></div>
                <div class="flex justify-between font-bold border-t pt-2 mt-2"><span>Total Amount Due:</span><span>₱${totalToPay.toFixed(2)}</span></div>
              </div>
            `;
            break;

          case 'planB':
            const downpaymentB = regularTotal + miscTotal;
            const remainingB = subtotal - downpaymentB;
            const monthlyB = remainingB / 4;
            totalToPay = subtotal;
            breakdownHTML = `
              <div class="space-y-2">
                <div class="flex justify-between"><span>Subtotal:</span><span>₱${subtotal.toFixed(2)}</span></div>
                <div class="flex justify-between"><span>Registration Fees:</span><span>₱${regularTotal.toFixed(2)}</span></div>
                <div class="flex justify-between"><span>Miscellaneous Fees:</span><span>₱${miscTotal.toFixed(2)}</span></div>
                <div class="flex justify-between font-semibold"><span>Downpayment (Reg + Misc):</span><span>₱${downpaymentB.toFixed(2)}</span></div>
                <div class="flex justify-between"><span>Remaining Balance:</span><span>₱${remainingB.toFixed(2)}</span></div>
                <div class="flex justify-between"><span>4 Monthly Payments:</span><span>₱${monthlyB.toFixed(2)} each</span></div>
              </div>
            `;
            break;
        }

        content.innerHTML = `
          ${subjectTableHTML}
          <div class="flex flex-col md:flex-row gap-6 mb-6">
            <!-- Left Column - Fees Breakdown -->
            <div class="flex-1 space-y-4">
              <div class="border rounded p-4">
                <h3 class="font-semibold mb-3 text-center">Payment Scheme: ${scheme.payment_name}</h3>
                <p class="text-sm text-gray-600 text-center mb-4">Plan: ${plan.toUpperCase()}</p>

                <h4 class="font-medium mb-2">Fixed Fees</h4>
                <table class="w-full mb-4">
                  <tr>
                    <td class="py-1">Registration Fees:</td>
                    <td class="py-1 text-right">₱${regularTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="py-1">Miscellaneous Fees:</td>
                    <td class="py-1 text-right">₱${miscTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="py-1">Affiliation Fee:</td>
                    <td class="py-1 text-right">₱${affTotal.toFixed(2)}</td>
                  </tr>
                </table>

                <h4 class="font-medium mb-2">Calculated Fees</h4>
                <table class="w-full">
                  <tr>
                    <td class="py-1">Computer Lab (${totalComLabUnits} units):</td>
                    <td class="py-1 text-right">₱${totalComLabFee.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="py-1">Laboratory (${totalLabUnits} units):</td>
                    <td class="py-1 text-right">₱${totalLabFee.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="py-1">CL Fees (${totalCLUnits} units):</td>
                    <td class="py-1 text-right">₱${totalCLFee.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="py-1">Clinic (${totalCUnits} units):</td>
                    <td class="py-1 text-right">₱${totalCFee.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="py-1">Tuition (${tuitionUnits} units):</td>
                    <td class="py-1 text-right">₱${totalTuitionFee.toFixed(2)}</td>
                  </tr>
                  ${nstpUnits > 0 ? `
                  <tr>
                    <td class="py-1">NSTP (${nstpUnits} units):</td>
                    <td class="py-1 text-right">₱${totalNSTPFee.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            </div>

            <!-- Right Column - Payment Plan -->
            <div class="flex-1">
              <div class="border rounded p-4 bg-gray-50 h-full">
                <h3 class="font-semibold mb-3 text-center">Payment Plan</h3>
                ${breakdownHTML}
              </div>
            </div>
          </div>

          <div class="text-xs text-gray-500">
            <p>Assigned on: ${new Date(payment.assigned_at).toLocaleString()}</p>
            <p>Assigned by: ${payment.assigned_by}</p>
          </div>
        `;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
      } else {
        alert('Failed to load payment details');
      }
    })
    .catch(error => {
      console.error('Error fetching payment details:', error);
      alert('Error loading payment details');
    });
}

// Close modal function
function closePaymentDetailsModal() {
  const modal = document.getElementById('paymentDetailsModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// Update DOMContentLoaded to fetch assigned payments
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  fetchPendingApprovals();
  fetchAssignedPayments();
  loadPaymentSchemes(); // If you have a schemes list to display
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', function () {
  fetch('/logout')
    .then(response => {
      if (response.redirected) {
        window.location.href = response.url;
      } else {
        alert("Logout failed.");
      }
    })
    .catch(error => {
      console.error("Logout error:", error);
      alert("An error occurred during logout.");
    });
});

document.addEventListener('DOMContentLoaded', function() {
  // Initialize Lucide icons
  lucide.createIcons();

  // Fetch user data
  fetch('/current_user')
    .then(response => response.json())
    .then(data => {
      if (data.success && data.user) {
        const user = data.user;

        // Set basic user info that everyone sees
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userEmailDropdown').textContent = user.email;
        document.getElementById('userName').textContent = `${user.first_name} ${user.last_name}`;

        // Set user role - Convert to lowercase for consistency but display with proper capitalization
        const userRole = user.user_type.toLowerCase();
        const roleDisplayText = userRole === 'program-head' ? 'Program Head'
                             : userRole === 'registrar' ? 'Registrar'
                             : userRole === 'finance' ? 'Finance'
                             : userRole.charAt(0).toUpperCase() + userRole.slice(1);

        document.getElementById('userRole').textContent = roleDisplayText;

        // Get references to all info sections
        const departmentInfo = document.getElementById('departmentInfo');
        const departmentName = document.getElementById('departmentName');
        const programsInfo = document.getElementById('programsInfo');
        const programsList = document.getElementById('programsList');

        // Clear existing programs
        programsList.innerHTML = '';

        // Role-based display logic
        switch(userRole) {
          case 'admin':
            // Admin only shows email (default state)
            departmentInfo.classList.add('hidden');
            programsInfo.classList.add('hidden');
            break;

          case 'dean':
            // Dean shows email and department
            if (user.department) {
              departmentName.textContent = `${user.department.name} (${user.department.code})`;
              departmentInfo.classList.remove('hidden');
            }
            programsInfo.classList.add('hidden');
            break;

          case 'program-head':
            // Program head shows email, department, and programs
            if (user.department) {
              departmentName.textContent = `${user.department.name} (${user.department.code})`;
              departmentInfo.classList.remove('hidden');
            }

            if (user.programs && user.programs.length > 0) {
              user.programs.forEach(program => {
                const li = document.createElement('li');
                li.className = 'py-1';
                li.textContent = `${program.name} (${program.code})`;
                programsList.appendChild(li);
              });
              programsInfo.classList.remove('hidden');
            }
            break;

          case 'registrar':
          case 'finance':
            // Registrar and Finance only show basic info
            departmentInfo.classList.add('hidden');
            programsInfo.classList.add('hidden');
            break;

          default:
            // Default case (shouldn't happen)
            departmentInfo.classList.add('hidden');
            programsInfo.classList.add('hidden');
        }
      }
    })
    .catch(error => {
      console.error('Error fetching user data:', error);
      alert('Failed to load user information');
    });

    fetchPendingApprovals();
    fetchAssignedPayments();
    loadPaymentSchemes();
});
