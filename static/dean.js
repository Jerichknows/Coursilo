// Initialize selectedSubjects array
let selectedSubjects = [];

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

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Lucide icons
  lucide.createIcons();

  // Load user data and setup UI based on role
  loadUserDataAndSetup();
});

async function loadUserDataAndSetup() {
  try {
    const userRes = await fetch('/current_user');
    const userData = await userRes.json();

    if (userData.success && userData.user) {
      setupUserProfile(userData.user);
      await loadYearSemesters();

      // Setup UI based on user role
      if (userData.user.user_type.toLowerCase() === 'dean') {
        await loadDepartments();
        document.getElementById('departmentSelectContainer').classList.remove('hidden');
        document.getElementById('programSelectContainer').classList.add('hidden');
      } else if (userData.user.user_type.toLowerCase() === 'program-head') {
        await loadAssignedPrograms();
        document.getElementById('departmentSelectContainer').classList.add('hidden');
        document.getElementById('programSelectContainer').classList.remove('hidden');
      }
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

function setupUserProfile(user) {
  // Set basic user info
  document.getElementById('userEmail').textContent = user.email;
  document.getElementById('userEmailDropdown').textContent = user.email;
  document.getElementById('userName').textContent = `${user.first_name} ${user.last_name}`;
  document.getElementById('userRole').textContent = user.user_type.toLowerCase();

  // Set department and programs info
  const departmentInfo = document.getElementById('departmentInfo');
  const departmentName = document.getElementById('departmentName');
  const programsInfo = document.getElementById('programsInfo');
  const programsList = document.getElementById('programsList');

  programsList.innerHTML = '';

  switch(user.user_type.toLowerCase()) {
    case 'admin':
      departmentInfo.classList.add('hidden');
      programsInfo.classList.add('hidden');
      break;
    case 'dean':
      if (user.department) {
        departmentName.textContent = `${user.department.name} (${user.department.code})`;
        departmentInfo.classList.remove('hidden');
      }
      programsInfo.classList.add('hidden');
      break;
    case 'program-head':
      if (user.department) {
        departmentName.textContent = `${user.department.name} (${user.department.code})`;
        departmentInfo.classList.remove('hidden');
      }
      if (user.programs && user.programs.length > 0) {
        user.programs.forEach(program => {
          const li = document.createElement('li');
          li.className = 'py-1 text-sm text-gray-700';
          li.textContent = `${program.name} (${program.code})`;
          programsList.appendChild(li);
        });
        programsInfo.classList.remove('hidden');
      } else {
        const li = document.createElement('li');
        li.className = 'py-1 text-sm text-gray-500 italic';
        li.textContent = 'No programs assigned';
        programsList.appendChild(li);
        programsInfo.classList.remove('hidden');
      }
      break;
    default:
      departmentInfo.classList.add('hidden');
      programsInfo.classList.add('hidden');
  }
}

async function loadYearSemesters() {
  try {
    const res = await fetch('/year-semester-sorted');
    const data = await res.json();

    const select = document.getElementById('yearSemesterSelect');
    select.innerHTML = '';

    // Find active and inactive entries
    const activeEntry = data.find(entry => entry.is_active);
    const inactiveEntries = data.filter(entry => !entry.is_active);

    // Add placeholder
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Select Year/Semester';
    placeholderOption.disabled = true;
    placeholderOption.selected = !activeEntry;
    select.appendChild(placeholderOption);

    // Add active entry first if exists
    if (activeEntry) {
      const option = document.createElement('option');
      option.value = activeEntry.id;
      option.textContent = `${activeEntry.school_year} - ${activeEntry.semester} (Active)`;
      option.selected = true;
      select.appendChild(option);
    }

    // Add inactive entries in optgroup
    if (inactiveEntries.length > 0) {
      const optGroup = document.createElement('optgroup');
      optGroup.label = 'Inactive Year/Semesters';

      inactiveEntries.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.id;
        option.textContent = `${entry.school_year} - ${entry.semester}`;
        optGroup.appendChild(option);
      });

      select.appendChild(optGroup);
    }
  } catch (err) {
    console.error('Failed to load year/semesters:', err);
    showNotification('Failed to load year/semester data');
  }
}

async function loadDepartments() {
  try {
    const res = await fetch('/departments_year');
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to load departments');
    }

    const select = document.getElementById('departmentSelect');
    select.innerHTML = '<option value="">Select Department</option>';

    // Get current user's department
    const userRes = await fetch('/current_user');
    const userData = await userRes.json();
    const currentDepartmentId = userData.user?.department?.id;

    data.departments.forEach(d => {
      const option = document.createElement('option');
      option.value = d.id;
      option.textContent = `${d.department} (${d.department_code})`;

      // Select current user's department by default
      if (currentDepartmentId && d.id === currentDepartmentId) {
        option.selected = true;
      }

      select.appendChild(option);
    });

    // If user has a department, trigger the change event to load year levels
    if (currentDepartmentId) {
      const yearSemesterId = document.getElementById('yearSemesterSelect').value;
      if (yearSemesterId) {
        await loadYearLevelsByDepartment(currentDepartmentId);
      }
    }
  } catch (err) {
    console.error('Failed to load departments:', err);
    showNotification('Failed to load department data');
  }
}

async function loadAssignedPrograms() {
  try {
    const res = await fetch('/assigned-programs');
    const result = await res.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to load programs');
    }

    const select = document.getElementById('programSelect');
    select.innerHTML = '<option value="">Select Program</option>';

    result.programs.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = `${p.program_name} (${p.program_code})`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Failed to load programs:', err);
    showNotification('Failed to load program data');
  }
}

async function loadYearLevelsByDepartment(departmentId) {
  const yearSelect = document.getElementById('yearLevelSelect');
  yearSelect.innerHTML = '<option value="">Select Year Level</option>';

  if (!departmentId) return;

  try {
    const res = await fetch(`/year_levels_by_department/${departmentId}`);
    const data = await res.json();

    if (data.success && data.year_levels && data.year_levels.length > 0) {
      const uniqueYearLevels = [...new Set(data.year_levels)].sort();

      uniqueYearLevels.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `Year ${year}`;
        yearSelect.appendChild(option);
      });
    } else {
      const option = document.createElement('option');
      option.disabled = true;
      option.textContent = 'No year levels found for this department';
      yearSelect.appendChild(option);
    }
  } catch (err) {
    console.error('Failed to load year levels:', err);
    showNotification('Failed to load year levels');
  }
}

// Event listeners for dropdown changes
document.getElementById('departmentSelect').addEventListener('change', async function() {
  const departmentId = this.value;
  const yearSemesterId = document.getElementById('yearSemesterSelect').value;

  if (departmentId && yearSemesterId) {
    await loadYearLevelsByDepartment(departmentId);
  }
});

document.getElementById('programSelect').addEventListener('change', async function() {
  const programId = this.value;
  const yearSemesterId = document.getElementById('yearSemesterSelect').value;

  if (programId && yearSemesterId) {
    try {
      const res = await fetch(`/get_program_details/${programId}`);
      const data = await res.json();

      if (data.success && data.program) {
        await loadYearLevelsByDepartment(data.program.department_id);
      }
    } catch (err) {
      console.error('Failed to load program details:', err);
      showNotification('Failed to load program details');
    }
  }
});

document.getElementById('yearLevelSelect').addEventListener('change', async function() {
  const yearLevel = this.value;
  const yearSemesterId = document.getElementById('yearSemesterSelect').value;

  const userRes = await fetch('/current_user');
  const userData = await userRes.json();

  if (userData.success && userData.user) {
    if (userData.user.user_type.toLowerCase() === 'dean') {
      const departmentId = document.getElementById('departmentSelect').value;
      if (yearLevel && departmentId && yearSemesterId) {
        await loadSubjects(yearSemesterId, departmentId, yearLevel);
      }
    } else {
      const programId = document.getElementById('programSelect').value;
      if (yearLevel && programId && yearSemesterId) {
        await loadSubjects(yearSemesterId, programId, yearLevel);
      }
    }
  }
});

async function loadSubjects(yearSemesterId, identifier, yearLevel) {
  try {
    let url;
    const userRes = await fetch('/current_user');
    const userData = await userRes.json();

    if (userData.success && userData.user.user_type.toLowerCase() === 'dean') {
      url = `/subjects_by_department_year?year_semester_id=${yearSemesterId}&department_id=${identifier}&year_level=${yearLevel}`;
    } else {
      url = `/subjects_by_program_year?year_semester_id=${yearSemesterId}&program_id=${identifier}&year_level=${yearLevel}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    const subjectSelect = document.getElementById('subjectSelect');
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';

    if (data.success && data.subjects.length > 0) {
      data.subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = `${subject.subject_code} - ${subject.subject_name}`;
        subjectSelect.appendChild(option);
      });
    } else {
      const option = document.createElement('option');
      option.disabled = true;
      option.textContent = 'No subjects found for this year level';
      subjectSelect.appendChild(option);
    }
  } catch (err) {
    console.error('Failed to load subjects:', err);
    showNotification('Failed to load subjects');
  }
}

// Subject selection handler
document.getElementById('subjectSelect').addEventListener('change', async function() {
  const subjectId = this.value;

  if (subjectId) {
    try {
      const response = await fetch(`/get_subject_details/${subjectId}`);
      const data = await response.json();

      if (data.success) {
        const subject = data.subject;

        if (!selectedSubjects.some(sub => sub.id === subject.id)) {
          selectedSubjects.push({
            id: subject.id,
            code: subject.subject_code,
            name: subject.subject_name,
            total_units: subject.total_units,
            lecture: subject.lecture,
            com_lab: subject.com_lab,
            laboratory: subject.laboratory,
            school_lecture: subject.school_lecture,
            clinic: subject.clinic,
            subject_type: subject.subject_type,
            is_nstp: subject.is_nstp
          });

          updateSelectedSubjectsTable();
          this.value = '';
        } else {
          showNotification('This subject has already been selected');
        }
      } else {
        showNotification('Failed to load subject details: ' + data.message);
      }
    } catch (error) {
      console.error('Error fetching subject details:', error);
      showNotification('Error loading subject details');
    }
  }
});

// Notification function
function showNotification(message) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.classList.remove('hidden');

  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}

// Update summary and table functions
function updateSummary() {
  const totalSubjects = selectedSubjects.length;
  const totalUnits = selectedSubjects.reduce((sum, subject) => sum + (subject.total_units || 0), 0);

  document.getElementById('totalSubjects').textContent = totalSubjects;
  document.getElementById('totalUnits').textContent = totalUnits;

  const loadStatus = document.getElementById('loadStatus');
  loadStatus.className = 'rounded-full px-3 py-1 text-sm font-medium ';

  if (totalUnits < 12) {
    loadStatus.textContent = 'Underloaded';
    loadStatus.classList.add('bg-yellow-100', 'text-yellow-800');
  } else if (totalUnits >= 12 && totalUnits <= 18) {
    loadStatus.textContent = 'Balanced';
    loadStatus.classList.add('bg-green-100', 'text-green-800');
  } else {
    loadStatus.textContent = 'Overloaded';
    loadStatus.classList.add('bg-red-100', 'text-red-800');
  }
}

function updateSelectedSubjectsTable() {
  const tableBody = document.getElementById('selectedSubjectsTable');
  tableBody.innerHTML = '';

  if (selectedSubjects.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10" class="placeholder-row py-8 text-center text-gray-500">
          No subjects selected. Please select a subject to add.
        </td>
      </tr>
    `;
  } else {
    selectedSubjects.forEach((subject, index) => {
      const row = document.createElement('tr');
      row.className = 'border-b border-gray-200 hover:bg-gray-50';
      row.innerHTML = `
        <td class="p-3 border">${subject.code}</td>
        <td class="p-3 border">${subject.name}</td>
        <td class="p-3 text-center border">${subject.total_units}</td>
        <td class="p-3 text-center border">${subject.lecture}</td>
        <td class="p-3 text-center border">${subject.com_lab}</td>
        <td class="p-3 text-center border">${subject.laboratory}</td>
        <td class="p-3 text-center border">${subject.school_lecture}</td>
        <td class="p-3 text-center border">${subject.clinic}</td>
        <td class="p-3 text-center border">
          ${subject.subject_type} ${subject.is_nstp ? '(NSTP)' : ''}
        </td>
        <td class="p-3 text-right border">
          <button class="remove-subject-btn text-red-500 hover:text-red-700" data-index="${index}">
            <i data-lucide="trash-2" class="h-4 w-4"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    lucide.createIcons();

    document.querySelectorAll('.remove-subject-btn').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        selectedSubjects.splice(index, 1);
        updateSelectedSubjectsTable();
        updateSummary();
      });
    });
  }

  updateSummary();
}

// View payment details
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

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  fetchAssignedPayments();
});
