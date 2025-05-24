
// =================
// BATCH MANAGEMENT
// =================
const batchManager = {
  loadBatchesFromStorage() {
    const savedBatches = localStorage.getItem('submittedBatches');
    state.submittedBatches = savedBatches ? JSON.parse(savedBatches) : [];
    this.updateBatchesUI();
  },

  saveBatch(professorName) {
    const totalSubjects = state.selectedSubjects.length;
    const totalUnits = state.selectedSubjects.reduce(
      (sum, subj) => sum + (subj.lecture || 0) + (subj.laboratory || 0) + (subj.com_lab || 0) +
                     (subj.school_lecture || 0) + (subj.clinic || 0), 0
    );

    const newBatch = {
      professorId: professorName,
      totalSubjects,
      totalUnits,
      subjects: [...state.selectedSubjects],
      id: Date.now().toString()
    };

    // Remove existing batch with same professor ID
    state.submittedBatches = state.submittedBatches.filter(
      b => b.professorId !== professorName
    );
    state.submittedBatches.push(newBatch);

    localStorage.setItem('submittedBatches', JSON.stringify(state.submittedBatches));
    this.updateBatchesUI();
    this.showConfirmationModal(professorName, newBatch.id);
    // Reset selected subjects
    state.selectedSubjects = [];
    subjectManager.resetSelectedSubjectsTable();
  },

  updateBatchesUI() {
    const container = elements.savedBatchesContainer;
    if (!container) return;

    if (state.submittedBatches.length === 0) {
      container.innerHTML = `
        <div class="w-full">
          <div class="py-8 text-center text-gray-500">
            No saved subjects. Fill up the subject offered form to get started.
          </div>
        </div>`;
      return;
    }

    container.innerHTML = '';
    state.submittedBatches.forEach(batch => {
      const batchDiv = document.createElement('div');
      batchDiv.className = 'min-w-[360px] bg-gray-100 hover:bg-gray-200 rounded-lg p-4 transition-colors duration-200 cursor-pointer';
      batchDiv.innerHTML = `
        <div class="flex justify-between items-center">
          <div class="text-lg font-semibold">${batch.professorId}</div>
          <div class="text-sm text-gray-500">${batch.totalSubjects} subjects</div>
        </div>
        <div class="text-sm text-gray-500 mt-1">${batch.totalUnits} units</div>
      `;
      // Add event listener to open modal
      batchDiv.addEventListener('click', () => {
        this.openBatchModal(batch.id);
      });
      container.appendChild(batchDiv);
    });
  },
  openBatchModal(batchId) {
    const batch = state.submittedBatches.find(b => b.id === batchId);
    if (!batch) return;

    // Remove any existing modal first
    const existingModal = document.getElementById('batchModal');
    if (existingModal) existingModal.remove();

    // Create modal HTML
    const modalHtml = `
      <div id="batchModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-white rounded-lg p-6 w-1/2 max-h-[80vh] overflow-y-auto">
          <h3 class="text-lg font-semibold mb-4">Details for ${batch.professorId}</h3>
          <p><strong>Total Subjects:</strong> ${batch.totalSubjects}</p>
          <p><strong>Total Units:</strong> ${batch.totalUnits}</p>
          <div class="mt-4">
            <h4 class="font-semibold">Subjects:</h4>
            <table class="min-w-full divide-y divide-gray-200 mt-2">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Units</th>
                  <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${batch.subjects.map(subject => `
                  <tr>
                    <td class="px-3 py-2 whitespace-nowrap">${subject.code}</td>
                    <td class="px-3 py-2 whitespace-nowrap">${subject.name}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-center">
                      ${(subject.lecture || 0) + (subject.laboratory || 0) + (subject.com_lab || 0) +
                       (subject.school_lecture || 0) + (subject.clinic || 0)}
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-center">${subject.subject_type || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="mt-6 flex justify-end gap-2">
            <button id="deleteBatchBtn" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md">Delete Batch</button>
            <button id="submitBatchBtn" class="px-4 py-2 bg-action hover:bg-action-hover text-white rounded-md">Submit to Registrar</button>
            <button id="closeBatchModalBtn" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md">Close</button>
          </div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add event listeners
    document.getElementById('deleteBatchBtn').addEventListener('click', () => {
      if (confirm("Are you sure you want to delete this batch?")) {
        this.deleteBatch(batchId);
      }
    });

    document.getElementById('submitBatchBtn').addEventListener('click', () => {
      this.submitSubjects(batchId);
    });

    document.getElementById('closeBatchModalBtn').addEventListener('click', () => {
      document.getElementById('batchModal').remove();
    });
  },

  deleteBatch(batchId) {
    const index = state.submittedBatches.findIndex(b => b.id === batchId);
    if (index === -1) return;

    state.submittedBatches.splice(index, 1);
    localStorage.setItem('submittedBatches', JSON.stringify(state.submittedBatches));
    this.updateBatchesUI();
    document.getElementById('batchModal').remove();
    utils.showNotification("Batch deleted successfully");
  },


  async submitSubjects(batchId) {
    const batchIndex = state.submittedBatches.findIndex(b => b.id === batchId);
    if (batchIndex === -1) return;
    const batch = state.submittedBatches[batchIndex];

    try {
      const response = await utils.fetchData('http://0.0.0.0:3000/submit_subjects', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professor_id: batch.professorId,
          subjects: batch.subjects.map(s => ({
            subject_code: s.code,
            subject_name: s.name,
            department: s.department,
            year_level: s.year,
            lecture: s.lecture,
            com_lab: s.com_lab,
            laboratory: s.laboratory,
            school_lecture: s.school_lecture,
            clinic: s.clinic,
            subject_type: s.subject_type,
            subject_nstp: s.subject_nstp
          }))
        })
      });

      utils.showNotification(`Subjects submitted successfully`);
      state.submittedBatches.splice(batchIndex, 1);
      localStorage.setItem('submittedBatches', JSON.stringify(state.submittedBatches));
      this.updateBatchesUI();
      document.getElementById('batchModal').remove();

      await Promise.all([
        subjectApproval.fetchApprovedSubjects(),
        subjectApproval.fetchDeniedSubjects()
      ]);
    } catch (error) {
      console.error("Submission error:", error);
      utils.showNotification("Submission failed: " + error.message);
    }
  },

  showConfirmationModal(professorName, batchId) {
    const batch = state.submittedBatches.find(b => b.id === batchId);
    if (!batch) return;
    if (!elements.savedSubjectsList) return;

    elements.savedSubjectsList.innerHTML = '';
    batch.subjects.forEach(sub => {
      elements.savedSubjectsList.innerHTML += `
        <div class="border-b border-gray-200 p-2">
          <p class="font-semibold">${sub.name}</p>
          <p>Code: ${sub.code}</p>
          <p>Lecture: ${sub.lecture}</p>
          <p>Com Laboratory: ${sub.com_lab}</p>
          <p>Laboratory: ${sub.laboratory}</p>
          <p>School Lecture: ${sub.school_lecture}</p>
          <p>Clinic: ${sub.clinic}</p>
          <p>subject type: ${sub.subject_type}</p>
          <p>subject nstp: ${sub.subject_nstp}</p>
        </div>`;
    });
    if (elements.confirmationProfessorName)
      elements.confirmationProfessorName.textContent = professorName;
    if (elements.confirmationTotalSubjects)
      elements.confirmationTotalSubjects.textContent = batch.totalSubjects;
    if (elements.confirmationTotalUnits)
      elements.confirmationTotalUnits.textContent = batch.totalUnits;
    if (elements.confirmationModal) {
      elements.confirmationModal.dataset.batchId = batchId;
      elements.confirmationModal.classList.remove("hidden");
    }
  },

  closeConfirmationModal() {
    if (elements.confirmationModal)
      elements.confirmationModal.classList.add("hidden");
  }
};
