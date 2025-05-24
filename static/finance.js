// Store subjects data grouped by professor
let professorsPending = {};
let professorsApproved = {};
let assignedProfessors = new Set(); // Track assigned professors

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  loadSubjects();
  loadApprovedSubjects();

  // Load previously assigned professors from localStorage
  const storedAssigned = localStorage.getItem('assignedProfessors');
  if (storedAssigned) {
    assignedProfessors = new Set(JSON.parse(storedAssigned));
  }
});

// Load pending approval subjects and group by professor
async function loadSubjects() {
  try {
    const response = await fetch('/get_approved_subjects');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const subjects = await response.json();

    // Group subjects by professor_id
    professorsPending = {};
    subjects.forEach(subject => {
      const profId = subject.professor_id || 'Unknown';
      // Skip if professor is already assigned
      if (!assignedProfessors.has(profId)) {
        if (!professorsPending[profId]) {
          professorsPending[profId] = {
            professor_id: profId,
            subjects: [],
            status: 'Pending Payment'
          };
        }
        professorsPending[profId].subjects.push(subject);
      }
    });

    renderPendingProfessors();
  } catch (error) {
    console.error("Error loading subjects:", error);
    showError(error.message);
  }
}

// Load already approved subjects and group by professor
async function loadApprovedSubjects() {
  try {
    const response = await fetch('/get_notifications_dean');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const subjects = await response.json();

    // Group subjects by professor_id
    professorsApproved = {};
    subjects.forEach(subject => {
      const profId = subject.professor_id || 'Unknown';
      if (!professorsApproved[profId]) {
        professorsApproved[profId] = {
          professor_id: profId,
          subjects: [],
          status: subject.status || 'Approved'
        };
      }
      professorsApproved[profId].subjects.push(subject);
      // Mark professor as assigned
      assignedProfessors.add(profId);
    });

    renderApprovedProfessors();
    // Save assigned professors to localStorage
    localStorage.setItem('assignedProfessors', JSON.stringify(Array.from(assignedProfessors)));
  } catch (error) {
    console.error("Error loading approved subjects:", error);
    showApprovedError(error.message);
  }
}

// Render pending professors to the table
function renderPendingProfessors() {
  const tableBody = document.getElementById('financeTableBody');
  tableBody.innerHTML = ''; // Clear existing rows

  if (Object.keys(professorsPending).length === 0) {
    tableBody.innerHTML = `
      <tr id="noFinanceRow">
          <td colspan="4" class="py-8 text-center text-gray-500">
              No approved subject offerings to process.
          </td>
      </tr>
    `;
    return;
  }

  Object.values(professorsPending).forEach(professor => {
    // Skip if professor is already assigned
    if (assignedProfessors.has(professor.professor_id)) return;

    const row = document.createElement('tr');
    row.className = 'border-b border-gray-200 hover:bg-gray-50';
    row.dataset.professorId = professor.professor_id;

    row.innerHTML = `
      <td class="p-3 text-gray-900">${professor.professor_id}</td>
      <td class="p-3 text-gray-900">${professor.subjects.length}</td>
      <td class="p-3 text-gray-900">
        <span class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
          ${professor.status}
        </span>
      </td>
      <td class="p-3 text-right">
          <button class="view-btn rounded bg-action px-3 py-1 text-xs font-medium text-white hover:bg-action-hover focus:outline-none focus:ring-2 focus:ring-action/20">
              View & Assign
          </button>
      </td>
    `;

    // Add event listener to view button
    const viewBtn = row.querySelector('.view-btn');
    viewBtn.addEventListener('click', () => openProfessorModal(professor));

    tableBody.appendChild(row);
  });
}

// Render approved professors to the table
function renderApprovedProfessors() {
  const tableBody = document.getElementById('approvedTableBody');
  tableBody.innerHTML = ''; // Clear existing rows

  if (Object.keys(professorsApproved).length === 0) {
    tableBody.innerHTML = `
      <tr id="noApprovedRow">
          <td colspan="4" class="py-8 text-center text-gray-500">
              No subjects have been approved by finance yet.
          </td>
      </tr>
    `;
    return;
  }

  Object.values(professorsApproved).forEach(professor => {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-200 hover:bg-gray-50';
    row.dataset.professorId = professor.professor_id;

    row.innerHTML = `
      <td class="p-3 text-gray-900">${professor.professor_id}</td>
      <td class="p-3 text-gray-900">${professor.subjects.length}</td>
      <td class="p-3 text-gray-900">
        <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          ${professor.status}
        </span>
      </td>
      <td class="p-3 text-right">
          <button class="view-btn rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200">
              View Details
          </button>
      </td>
    `;

    // Add event listener to view button
    const viewBtn = row.querySelector('.view-btn');
    viewBtn.addEventListener('click', () => openProfessorModal(professor));

    tableBody.appendChild(row);
  });
}

function openProfessorModal(professor) {
    const modalId = `professorModal-${professor.professor_id}`;
    const isPending = professor.status === 'Pending Payment';

    // Check if modal already exists and remove it if it does
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }

    // Load payment schemes if pending
    if (isPending) {
        loadPaymentSchemesIntoDropdown(professor.professor_id);
    }

    // Calculate totals for all subjects
    let totalUnits = 0;
    let totalLecture = 0;
    let totalComLab = 0;
    let totalLaboratory = 0;
    let totalSchoolLecture = 0;
    let totalClinic = 0;

    professor.subjects.forEach(subject => {
        totalUnits += (parseFloat(subject.lecture) || 0) +
                     (parseFloat(subject.laboratory) || 0) +
                     (parseFloat(subject.com_lab) || 0) +
                     (parseFloat(subject.school_lecture) || 0) +
                     (parseFloat(subject.clinic) || 0);
        totalLecture += parseFloat(subject.lecture) || 0;
        totalComLab += parseFloat(subject.com_lab) || 0;
        totalLaboratory += parseFloat(subject.laboratory) || 0;
        totalSchoolLecture += parseFloat(subject.school_lecture) || 0;
        totalClinic += parseFloat(subject.clinic) || 0;
    });

    // Create modal dynamically
    const modalHTML = `
        <div id="${modalId}" class="fixed inset-0 z-50 overflow-y-auto">
            <div class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div class="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                <span class="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
                <div class="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle">
                    <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div class="sm:flex sm:items-start">
                            <div class="mt-3 w-full text-center sm:mt-0 sm:text-left">
                                <h3 class="text-lg font-medium leading-6 text-gray-900">Professor: ${professor.professor_id}</h3>
                                <div class="mt-4">
                                    <div class="overflow-x-auto">
                                        <table class="min-w-full divide-y divide-gray-200">
                                            <thead class="bg-gray-50">
                                            <tr class="border-b bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                                                <th class="p-3 font-medium border" colspan="4"></th>
                                                <th class="p-3 text-center font-medium border" colspan="2">LAB</th>
                                                <th class="p-3 text-center font-medium border" colspan="2">RLE</th>
                                            </tr>
                                            <tr>
                                                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Code</th>
                                                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Name</th>
                                                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                                                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lecture</th>
                                                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Computer Laboratory</th>
                                                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Laboratory</th>
                                                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CL</th>
                                                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">C</th>
                                            </tr>
                                            </thead>
                                            <tbody class="bg-white divide-y divide-gray-200">
                                                ${professor.subjects.map(subject => `
                                                    <tr>
                                                        <td class="px-3 py-2 text-center whitespace-nowrap text-sm text-gray-900">${subject.subject_code}</td>
                                                        <td class="px-3 py-2 text-center whitespace-nowrap text-sm text-gray-900">${subject.subject_name}</td>
                                                        <td class="p-3 text-center text-gray-900">${
                                                            (subject.lecture || 0) +
                                                            (subject.laboratory || 0) +
                                                            (subject.com_lab || 0) +
                                                            (subject.school_lecture || 0) +
                                                            (subject.clinic || 0)
                                                        }</td>
                                                        <td class="p-3 text-center text-gray-900">${subject.lecture || 0}</td>
                                                        <td class="p-3 text-center text-gray-900">${subject.com_lab || 0}</td>
                                                        <td class="p-3 text-center text-gray-900">${subject.laboratory || 0}</td>
                                                        <td class="p-3 text-center text-gray-900">${subject.school_lecture || 0}</td>
                                                        <td class="p-3 text-center text-gray-900">${subject.clinic || 0}</td>
                                                    </tr>
                                                `).join('')}
                                                <tr class="border-b bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                                                    <th class="p-3 text-right font-medium border" colspan="2">Total Units</th>
                                                    <th class="p-3 text-center font-medium border">${totalUnits}</th>
                                                    <th class="p-3 text-center font-medium border">${totalLecture}</th>
                                                    <th class="p-3 text-center font-medium border">${totalComLab}</th>
                                                    <th class="p-3 text-center font-medium border">${totalLaboratory}</th>
                                                    <th class="p-3 text-center font-medium border">${totalSchoolLecture}</th>
                                                    <th class="p-3 text-center font-medium border">${totalClinic}</th>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${isPending ? `
                    <!-- Payment assignment form for pending payments -->
                    <div class="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <div class="w-full">
                            <div class="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Payment Scheme</label>
                                    <select id="paymentScheme-${professor.professor_id}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-action focus:ring-action sm:text-sm">
                                        <option value="">Select Scheme</option>
                                    </select>
                                </div>
                                <div class="col-span-2">
                                    <div id="schemeDetails-${professor.professor_id}" class="grid grid-cols-2 gap-2 p-2 bg-gray-100 rounded-md">
                                        <!-- Scheme details will be displayed here -->
                                    </div>
                                </div>
                            </div>

                            <!-- Payment Plan Section -->
                            <div class="grid grid-cols-3 gap-4 mb-4" id="paymentPlanSection-${professor.professor_id}" style="display: none;">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Payment Plan</label>
                                    <select id="paymentPlan-${professor.professor_id}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-action focus:ring-action sm:text-sm">
                                        <option value="">Select Plan</option>
                                        <option value="cash">Cash</option>
                                        <option value="planA">Plan A</option>
                                        <option value="planB">Plan B</option>
                                    </select>
                                </div>
                                <div class="col-span-2">
                                    <div id="planDetails-${professor.professor_id}" class="p-2 bg-gray-100 rounded-md">
                                        <!-- Plan details will be displayed here -->
                                    </div>
                                </div>
                            </div>

                            <div class="flex justify-end">
                                <button type="button" id="cancelModal-${professor.professor_id}" class="mr-3 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2">
                                    Cancel
                                </button>
                                <button type="button" id="assignPayment-${professor.professor_id}" class="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                                    Assign Payment to All
                                </button>
                            </div>
                        </div>
                    </div>
                    ` : `
                    <!-- Payment details display for processed payments -->
                    <div class="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <div class="w-full">
                            <h4 class="text-lg font-medium text-gray-900 mb-4">Payment Details</h4>
                            <div id="assignedPaymentDetails-${professor.professor_id}" class="grid grid-cols-2 gap-4 p-4 bg-gray-100 rounded-md">
                                <!-- Payment details will be loaded here -->
                                <div class="col-span-2 text-center py-4">
                                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-action"></div>
                                    <p class="mt-2 text-gray-600">Loading payment details...</p>
                                </div>
                            </div>
                            <div class="flex justify-end mt-4">
                                <button type="button" id="cancelModal-${professor.professor_id}" class="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                    `}
                </div>
            </div>
        </div>
    `;

    // Add modal to the DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listeners to the new modal
    document.getElementById(`cancelModal-${professor.professor_id}`)?.addEventListener('click', () => {
        document.getElementById(modalId).remove();
    });

    if (isPending) {
        document.getElementById(`assignPayment-${professor.professor_id}`)?.addEventListener('click', () => {
            assignPaymentToProfessor(professor.professor_id);
        });
    } else {
        // Load assigned payment details for processed payments
        loadAssignedPaymentDetails(professor.professor_id);
    }
}

// Show error message for pending subjects
function showError(message) {
  const tableBody = document.getElementById('financeTableBody');
  tableBody.innerHTML = `
    <tr>
        <td colspan="4" class="py-8 text-center text-red-500">
            Error loading data: ${message}
        </td>
    </tr>
  `;
}

// Show error message for approved subjects
function showApprovedError(message) {
  const tableBody = document.getElementById('approvedTableBody');
  tableBody.innerHTML = `
    <tr>
        <td colspan="4" class="py-8 text-center text-red-500">
            Error loading approved subjects: ${message}
        </td>
    </tr>
  `;
}

  function displaySchemeDetails(professorId, scheme) {
    const detailsContainer = document.getElementById(`schemeDetails-${professorId}`);
    const paymentPlanSection = document.getElementById(`paymentPlanSection-${professorId}`);

    // Get the professor's subjects
    const professor = professorsPending[professorId];
    if (!professor || !professor.subjects || professor.subjects.length === 0) return;

    // Calculate total units across all subjects
    let totalLabUnits = 0;
    let totalRLEUnits = 0;
    let totalPerUnit = 0;
    let totalNSTPUnits = 0;
    let totalComLabUnits = 0;
    let totalLaboratoryUnits = 0;
    let totalSchoolLectureUnits = 0;
    let totalClinicUnits = 0;

    professor.subjects.forEach(subject => {
        const subjectUnits = (parseFloat(subject.school_lecture) || 0) +
                           (parseFloat(subject.clinic) || 0) +
                           (parseFloat(subject.com_lab) || 0) +
                           (parseFloat(subject.lecture) || 0) +
                           (parseFloat(subject.laboratory) || 0);

        if (subject.subject_nstp) {
            totalNSTPUnits += subjectUnits;
        } else {
            totalPerUnit += subjectUnits;
        }

        // Calculate lab units (com_lab + laboratory)
        totalComLabUnits += parseFloat(subject.com_lab) || 0;
        totalLaboratoryUnits += parseFloat(subject.laboratory) || 0;
        totalLabUnits = totalComLabUnits + totalLaboratoryUnits;

        // Calculate RLE units (school_lecture + clinic) separately
        totalSchoolLectureUnits += parseFloat(subject.school_lecture) || 0;
        totalClinicUnits += parseFloat(subject.clinic) || 0;
        totalRLEUnits = totalSchoolLectureUnits + totalClinicUnits;
    });

    // Calculate the fees
    const totalLabFees = (totalComLabUnits * parseFloat(scheme.com_lab_fee || 0)) +
                        (totalLaboratoryUnits * parseFloat(scheme.laboratory_fee || 0));

    const totalRLEFees = (totalSchoolLectureUnits * parseFloat(scheme.school_lecture_fee || 0)) +
                        (totalClinicUnits * parseFloat(scheme.clinic_fee || 0));

    const totalPerTuitionFees = totalPerUnit * parseFloat(scheme.tuition_fee);
    const totalNSTPFees = totalNSTPUnits * parseFloat(scheme.unit_fee || 0);

    // Calculate total fees
    const totalFees = parseFloat(scheme.regular_fees || 0) +
                     parseFloat(scheme.misc_fees || 0) +
                     totalLabFees +
                     totalRLEFees +
                     parseFloat(scheme.aff_fee || 0) +
                     totalPerTuitionFees +
                     totalNSTPFees;

    // Store the scheme and calculated fees for later calculations
    detailsContainer.dataset.scheme = JSON.stringify({
        ...scheme,
        calculatedLabFees: totalLabFees,
        calculatedRLEFees: totalRLEFees,
        calculatedTuitionFees: totalPerTuitionFees,
        calculatedNSTPFees: totalNSTPFees,
        totalLabUnits,
        totalRLEUnits,
        totalPerUnit,
        totalNSTPUnits,
        totalPerTuitionFees,
        totalFees
    });

    detailsContainer.innerHTML = `
        <div>
            <span class="text-gray-500">Registration Fee:</span>
            <span class="font-medium">₱${parseFloat(scheme.regular_fees || 0).toFixed(2)}</span>
        </div>
        <div>
            <span class="text-gray-500">Miscellaneous Fee:</span>
            <span class="font-medium">₱${parseFloat(scheme.misc_fees || 0).toFixed(2)}</span>
        </div>
        <div>
            <span class="text-gray-500">Lab Fees (${totalLabUnits} units):</span>
            <span class="font-medium">₱${totalLabFees.toFixed(2)}</span>
        </div>
        <div>
            <span class="text-gray-500">RLE Fees (${totalRLEUnits} units):</span>
            <span class="font-medium">₱${totalRLEFees.toFixed(2)}</span>
        </div>
        <div>
            <span class="text-gray-500">Affiliation Fee:</span>
            <span class="font-medium">₱${parseFloat(scheme.aff_fee || 0).toFixed(2)}</span>
        </div>
        <div>
            <span class="text-gray-500">Tuition Fee (${totalPerUnit} units):</span>
            <span class="font-medium">₱${totalPerTuitionFees.toFixed(2)}</span>
        </div>
        <div>
            <span class="text-gray-500">NSTP Fee (${totalNSTPUnits} units):</span>
            <span class="font-medium">₱${totalNSTPFees.toFixed(2)}</span>
        </div>
        <div class="border-t border-gray-200 pt-2 mt-2">
            <span class="text-gray-700 font-semibold">Total Fees:</span>
            <span class="font-bold text-lg">₱${totalFees.toFixed(2)}</span>
        </div>
    `;

    paymentPlanSection.style.display = 'grid';

    // Add event listener to payment plan dropdown
    const planSelect = document.getElementById(`paymentPlan-${professorId}`);
    planSelect.addEventListener('change', (e) => {
        const selectedPlan = e.target.value;
        if (selectedPlan) {
            calculatePaymentPlan(professorId, selectedPlan);
        } else {
            document.getElementById(`planDetails-${professorId}`).innerHTML = '';
        }
    });
  }


  async function loadPaymentSchemesIntoDropdown(professorId) {
  try {
    const response = await fetch('/payment-schemes');
    if (!response.ok) {
      throw new Error('Failed to fetch payment schemes');
    }
    const schemes = await response.json();

    const selectElement = document.getElementById(`paymentScheme-${professorId}`);
    const detailsContainer = document.getElementById(`schemeDetails-${professorId}`);

    // Clear existing options except the first one
    while (selectElement.options.length > 1) {
      selectElement.remove(1);
    }

    // Add new options
    schemes.forEach(scheme => {
      const option = document.createElement('option');
      option.value = scheme.id;
      option.textContent = scheme.payment_name;
      option.dataset.scheme = JSON.stringify(scheme); // Store the entire scheme object
      selectElement.appendChild(option);
    });

    // Add event listener to show details when a scheme is selected
    selectElement.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption.value) {
        const scheme = JSON.parse(selectedOption.dataset.scheme);
        displaySchemeDetails(professorId, scheme);
      } else {
        detailsContainer.innerHTML = '';
      }
    });

  } catch (error) {
    console.error('Error loading payment schemes:', error);
    showNotification('error', 'Failed to load payment schemes');
    }
  }
