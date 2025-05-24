// ======================
// GLOBAL STATE MANAGEMENT
// ======================
const state = {
  selectedSubjects: [],
  submittedBatches: [],
  deniedSubjects: [],
  professorId: null
};

// =============
// DOM ELEMENTS
// =============
const elements = {
  departmentSelect: document.getElementById("departmentSelect"),
  yearSelect: document.getElementById("yearSelect"),
  subjectSelect: document.getElementById("subjectSelect"),
  selectedSubjectsTable: document.getElementById("selectedSubjectsTable"),
  savedBatchesContainer: document.getElementById("savedBatchesContainer"),
  approvedSubjectsTable: document.getElementById("approvedSubjectsTable"),
  deniedSubjectsTable: document.getElementById("deniedSubjectsTable"),
  notification: document.getElementById("notification"),
  loadStatus: document.getElementById("loadStatus"),
  totalSubjects: document.getElementById("totalSubjects"),
  totalUnits: document.getElementById("totalUnits"),
  professorModal: document.getElementById("professorModal"),
  professorName: document.getElementById("professorName"),
  confirmSave: document.getElementById("confirmSave"),
  cancelProfessorModal: document.getElementById("cancelProfessorModal"),
  confirmationModal: document.getElementById("confirmationModal"),
  savedSubjectsList: document.getElementById("savedSubjectsList"),
  confirmationProfessorName: document.getElementById("confirmationProfessorName"),
  confirmationTotalSubjects: document.getElementById("confirmationTotalSubjects"),
  confirmationTotalUnits: document.getElementById("confirmationTotalUnits")
};

// ===================
// UTILITIES
// ===================
const utils = {
  showNotification(message, duration = 3000) {
    if (elements.notification) {
      elements.notification.textContent = message;
      elements.notification.classList.remove("hidden");
      setTimeout(() => {
        elements.notification.classList.add("hidden");
      }, duration);
    }
  },

  async fetchData(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  },

  removeAllModals() {
    ['professorSubjectsModal', 'deniedSubjectModal', 'deniedSubjectModal'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal) modal.remove();
    });
  }
};


// ===================
// SUBJECT APPROVAL
// ===================
const subjectApproval = {
  async fetchApprovedSubjects() {
    try {
      const approvedSubjects = await utils.fetchData('/get_notifications_dean');
      this.displayApprovedSubjects(approvedSubjects);
    } catch (error) {
      console.error('Error fetching approved subjects:', error);
      utils.showNotification("Failed to load approved subjects");
    }
  },

  displayApprovedSubjects(approvedSubjects) {
    const tableBody = elements.approvedSubjectsTable;
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (approvedSubjects.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-gray-500">No approved subjects yet.</td></tr>`;
      return;
    }

    approvedSubjects.forEach(subject => {
      const totalUnits = (subject.lecture || 0) + (subject.laboratory || 0) + (subject.com_lab || 0) + (subject.school_lecture || 0) + (subject.clinic || 0);
      const row = document.createElement('tr');
      row.className = 'border-b border-gray-200 hover:bg-gray-50';
      row.innerHTML = `
        <td class="p-3 text-gray-900">${subject.subject_code}</td>
        <td class="p-3 text-gray-900">${subject.subject_name}</td>
        <td class="p-3 text-center">${totalUnits}</td>
        <td class="p-3 text-center">${subject.lecture}</td>
        <td class="p-3 text-center">${subject.com_lab}</td>
        <td class="p-3 text-center">${subject.laboratory}</td>
        <td class="p-3 text-center">${subject.school_lecture}</td>
        <td class="p-3 text-center">${subject.clinic}</td>
        <td class="p-3 text-center">${subject.subject_type}</td>
        <td class="p-3 text-right text-green-600 font-medium">Payment Assigned</td>
      `;
      tableBody.appendChild(row);
    });
  },

  async fetchDeniedSubjects() {
    try {
      const deniedSubjects = await utils.fetchData('/get_denied_subjects');
      state.deniedSubjects = deniedSubjects;
      this.displayDeniedSubjects(deniedSubjects);
    } catch (error) {
      console.error('Error fetching denied subjects:', error);
    }
  },

  displayDeniedSubjects(subjects) {
    const tableBody = elements.deniedSubjectsTable;
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (subjects.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-gray-500">No denied subjects to display.</td></tr>`;
      return;
    }

    subjects.forEach(subject => {
      const totalUnits = (subject.lecture || 0) + (subject.laboratory || 0)  + (subject.com_lab || 0) + (subject.school_lecture || 0) + (subject.clinic || 0);
      const row = document.createElement('tr');
      row.className = 'border-b border-gray-200 hover:bg-gray-50';
      row.innerHTML = `
        <td class="p-3 text-gray-900">${subject.subject_code}</td>
        <td class="p-3 text-gray-900">${subject.subject_name}</td>
        <td class="p-3 text-center">${totalUnits}</td>
        <td class="p-3 text-center">${subject.lecture}</td>
        <td class="p-3 text-center">${subject.com_lab}</td>
        <td class="p-3 text-center">${subject.laboratory}</td>
        <td class="p-3 text-center">${subject.school_lecture}</td>
        <td class="p-3 text-center">${subject.clinic}</td>
        <td class="p-3 text-center">${subject.subject_type}</td>
        <td class="p-3 text-right">
          <button class="view-denied-details rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-200" data-subject-id="${subject.id}">
            View Reason
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    // Add event listeners for "View Reason" buttons
    document.querySelectorAll('.view-denied-details').forEach(button => {
      button.addEventListener('click', () => {
        const subjectId = button.getAttribute('data-subject-id');
        const subject = state.deniedSubjects.find(s => s.id == subjectId);
        if (subject) {
          this.showDenialReason(subject.subject_code, subject.comment);
        }
      });
    });
  },

  showDenialReason(subjectCode, comment) {
    utils.removeAllModals();

    const modalHTML = `
      <div id="deniedSubjectModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-20 flex items-center justify-center">
        <div class="relative mx-auto p-5 border w-1/2 shadow-lg rounded-md bg-white">
          <div class="mt-3 text-center">
            <h3 id="deniedModalTitle" class="text-lg leading-6 font-medium text-gray-900">Denial Reason for ${subjectCode}</h3>
            <div class="mt-2 px-7 py-3">
              <p id="deniedSubjectDetails" class="text-gray-700">Reason: ${comment || 'No reason provided'}</p>
            </div>
            <div class="items-center px-4 py-3">
              <button id="close-denied-modal" class="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300">Close</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Attach close event
    setTimeout(() => {
      document.getElementById('close-denied-modal')?.addEventListener('click', () => {
        utils.removeAllModals();
      });
    }, 0);
  }
};

// ===================
// MODAL HANDLERS
// ===================
function closeProfessorModal() {
  if (elements.professorModal) {
    elements.professorModal.classList.add("hidden");
    if (elements.professorName) {
      elements.professorName.value = '';
    }
  }
}

const modalHandlers = {
  openProfessorModal() {
    if (elements.professorModal) {
      if (state.selectedSubjects.length === 0) {
        utils.showNotification("Please select at least one subject before saving.");
        return;
      }
      elements.professorModal.classList.remove("hidden");
    }
  },
  closeProfessorModal: closeProfessorModal
};

// ===================
// EVENT LISTENERS
// ===================

// Save button to open modal
const saveBtn = document.getElementById("saveButton");
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    modalHandlers.openProfessorModal();
  });
}


// Confirm Save in modal
if (elements.confirmSave) {
  elements.confirmSave.addEventListener('click', () => {
    const professorName = elements.professorName?.value.trim();
    if (professorName) {
      batchManager.saveBatch(professorName);
      modalHandlers.closeProfessorModal();
      utils.showNotification("Subjects saved successfully!");
    } else {
      utils.showNotification("Please enter the professor name.");
    }
  });
}

// Remove subject button handler
if (elements.selectedSubjectsTable) {
  elements.selectedSubjectsTable.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-subject-btn')) {
      subjectManager.removeSubject(event.target);
    }
  });
}

// Optional: Close "denied" modal on background click
document.addEventListener('click', (event) => {
  const deniedModal = document.getElementById('deniedSubjectModal');
  if (deniedModal && event.target === deniedModal) {
    utils.removeAllModals();
  }
});

// ===================
// INITIALIZATION
// ===================
document.addEventListener("DOMContentLoaded", () => {
  // Initialize
  if (typeof lucide !== 'undefined') lucide.createIcons();
  batchManager.loadBatchesFromStorage();
  subjectManager.fetchDepartments();
  subjectManager.resetSelectedSubjectsTable();

  // Department select change
  if (elements.departmentSelect) {
    elements.departmentSelect.addEventListener("change", (e) => {
      subjectManager.fetchYearsByDepartment(e.target.value);
    });
  }

  // Year select change
  if (elements.yearSelect) {
    elements.yearSelect.addEventListener("change", (e) => {
      const department = elements.departmentSelect.value;
      subjectManager.fetchSubjectsByDepartmentAndYear(department, e.target.value);
    });
  }

  // Subject select change
  if (elements.subjectSelect) {
    elements.subjectSelect.addEventListener("change", () => {
      subjectManager.handleSubjectSelection();
    });
  }

  // Load approved and denied subjects
  Promise.all([
    subjectApproval.fetchApprovedSubjects(),
    subjectApproval.fetchDeniedSubjects()
  ]);
});
