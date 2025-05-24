
// ===================
// SUBJECT APPROVAL
// ===================
const subjectApproval = {
  async fetchApprovedSubjects() {
    try {
      const approvedSubjects = await utils.fetchData('http://127.0.0.1:5000/get_notifications_dean');
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
      const deniedSubjects = await utils.fetchData('http://127.0.0.1:5000/get_denied_subjects');
      state.deniedSubjects = deniedSubjects;
      this.displayDeniedSubjects(deniedSubjects);
    } catch (error) {
      console.error('Error fetching denied subjects:', error);
      utils.showNotification("Failed to load denied subjects");
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
