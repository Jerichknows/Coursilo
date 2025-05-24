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
  container.innerHTML = '<div class="swiper-slide p-4 text-center text-gray-500">Loading payment schemes...</div>';

  try {
    const response = await fetch('/payment-schemes');
    if (!response.ok) {
      throw new Error('Failed to fetch payment schemes');
    }

    const schemes = await response.json();

    if (schemes.length === 0) {
      container.innerHTML = '<div class="swiper-slide p-4 text-center text-gray-500">No payment schemes found</div>';
      return;
    }

    container.innerHTML = '';
    schemes.forEach(scheme => {
      const schemeElement = document.createElement('div');
      schemeElement.className = 'swiper-slide p-4 hover:bg-gray-50';
      schemeElement.innerHTML = `
        <div class="flex flex-col h-full">
          <div class="flex-grow">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-medium text-lg text-gray-800">${scheme.payment_name}</h3>
                <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span class="text-gray-500">Registration:</span>
                    <span class="font-medium">₱${scheme.regular_fees}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">Misc:</span>
                    <span class="font-medium">₱${scheme.misc_fees}</span>
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

    // Initialize or update Swiper
    if (window.schemesSwiper) {
      window.schemesSwiper.destroy(true, true);
    }

    window.schemesSwiper = new Swiper('.mySwiper', {
      slidesPerView: 1,
      spaceBetween: 20,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      breakpoints: {
        640: {
          slidesPerView: 2,
        },
        1024: {
          slidesPerView: 3,
        }
      }
    });

    // Refresh icons after all schemes are added
    lucide.createIcons();
  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = '<div class="swiper-slide p-4 text-center text-red-500">Error loading payment schemes</div>';
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
