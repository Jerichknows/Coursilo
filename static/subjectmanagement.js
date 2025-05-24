// ===================
// SUBJECT MANAGEMENT
// ===================
const subjectManager = {
  async fetchDepartments() {
    try {
      const departments = await utils.fetchData("/get_departments");
      if (elements.departmentSelect) {
        elements.departmentSelect.innerHTML = '<option value="">Select Department</option>';
        departments.forEach(dept => {
          const option = document.createElement("option");
          option.value = dept;
          option.textContent = dept;
          elements.departmentSelect.appendChild(option);
        });
      }
      // Reset year and subject selects
      if (elements.yearSelect) {
        elements.yearSelect.innerHTML = '<option value="">Select Year Level</option>';
        elements.yearSelect.disabled = true;
      }
      if (elements.subjectSelect) {
        elements.subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        elements.subjectSelect.disabled = true;
      }
    } catch (error) {
      utils.showNotification("Failed to load departments");
    }
  },

  async fetchYearsByDepartment(department) {
    if (!department) return;
    try {
      const years = await utils.fetchData(`/get_years_by_department/${department}`);
      if (elements.yearSelect) {
        elements.yearSelect.innerHTML = '<option value="">Select Year Level</option>';
        years.forEach(year => {
          const option = document.createElement("option");
          option.value = year;
          option.textContent = year;
          elements.yearSelect.appendChild(option);
        });
        elements.yearSelect.disabled = false;
      }
      // Reset subject select
      if (elements.subjectSelect) {
        elements.subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        elements.subjectSelect.disabled = true;
      }
    } catch (error) {
      utils.showNotification("Failed to load years");
    }
  },

  async fetchSubjectsByDepartmentAndYear(department, year) {
    if (!department || !year) return;
    try {
      const subjects = await utils.fetchData(
        `/get_subjects_by_department_and_year/${department}/${year}`
      );

      if (elements.subjectSelect) {
        elements.subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        subjects.forEach(subject => {
          const option = document.createElement("option");
          option.value = subject.id; // Using subject ID as value
          option.textContent = `${subject.subject_code} - ${subject.subject_name}`;
          option.dataset.subject = JSON.stringify(subject); // Store full subject data
          elements.subjectSelect.appendChild(option);
        });
        elements.subjectSelect.disabled = false;
      }
    } catch (error) {
      utils.showNotification("Failed to load subjects");
    }
  },

  handleSubjectSelection() {
    const selectedOption = elements.subjectSelect?.selectedOptions[0];
    if (!selectedOption || !selectedOption.value) return;

    // Remove placeholder row if it exists
    const placeholderRow = elements.selectedSubjectsTable?.querySelector('.placeholder-row');
    if (placeholderRow) {
      placeholderRow.remove();
    }

    const subjectData = JSON.parse(selectedOption.dataset.subject);
    this.addSubjectToTable(subjectData);
    this.updateSummary();

    // Reset the subject select
    if (elements.subjectSelect) {
      elements.subjectSelect.selectedIndex = 0;
    }
  },

  addSubjectToTable(subject) {
    // Remove placeholder row if it exists
    const placeholderRow = elements.selectedSubjectsTable?.querySelector('.placeholder-row');
    if (placeholderRow) {
      placeholderRow.remove();
    }

    const totalUnits = (subject.lecture || 0) + (subject.laboratory || 0) + (subject.com_lab || 0) +
                      (subject.school_lecture || 0) + (subject.clinic || 0);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="p-3">${subject.subject_code}</td>
      <td class="p-3">${subject.subject_name}</td>
      <td class="p-3 text-center">${totalUnits}</td>
      <td class="p-3 text-center">${subject.lecture}</td>
      <td class="p-3 text-center">${subject.com_lab}</td>
      <td class="p-3 text-center">${subject.laboratory}</td>
      <td class="p-3 text-center">${subject.school_lecture}</td>
      <td class="p-3 text-center">${subject.clinic}</td>
      <td class="p-3 text-center">${subject.subject_type}</td>
      <td class="p-3 text-right">
        <button class="remove-subject-btn text-red-500 hover:text-red-700">Remove</button>
      </td>
    `;
    if (elements.selectedSubjectsTable) {
      elements.selectedSubjectsTable.appendChild(row);
    }

    // Save subject to state
    state.selectedSubjects.push({
      code: subject.subject_code,
      name: subject.subject_name,
      department: subject.department,
      year: subject.year_level,
      lecture: subject.lecture,
      com_lab: subject.com_lab,
      laboratory: subject.laboratory,
      school_lecture: subject.school_lecture,
      clinic: subject.clinic,
      subject_type: subject.subject_type,
      subject_nstp: subject.subject_nstp
    });
  },

  removeSubject(button) {
    const row = button.closest("tr");
    const subjectCode = row.cells[0].textContent;

    row.remove();
    state.selectedSubjects = state.selectedSubjects.filter(
      subject => subject.code !== subjectCode
    );

    // Show placeholder if no subjects left
    if (elements.selectedSubjectsTable && elements.selectedSubjectsTable.rows.length === 0) {
      this.showNoSubjectsPlaceholder();
    }

    this.updateSummary();
  },

  // In your showNoSubjectsPlaceholder() function:
  showNoSubjectsPlaceholder() {
    if (elements.selectedSubjectsTable) {
      elements.selectedSubjectsTable.innerHTML = `
      <tr class="placeholder-row">
        <td colspan="9" class="py-8 text-center text-gray-500">
          No subjects selected. Please select a department and a year level.
        </td>
      </tr>`;
    }
  },

  updateSummary() {
    const totalSubjects = state.selectedSubjects.length;
    const totalUnits = state.selectedSubjects.reduce(
      (sum, subj) => sum + (subj.lecture || 0) + (subj.laboratory || 0) + (subj.com_lab || 0) +
                     (subj.school_lecture || 0) + (subj.clinic || 0), 0
    );

    if (elements.totalSubjects) elements.totalSubjects.textContent = totalSubjects;
    if (elements.totalUnits) elements.totalUnits.textContent = totalUnits;

    if (elements.loadStatus) {
      if (totalUnits > 12) {
        elements.loadStatus.textContent = "Overload";
        elements.loadStatus.className = "px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800 border border-orange-200";
      } else if (totalUnits > 0) {
        elements.loadStatus.textContent = "Regular Load";
        elements.loadStatus.className = "px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 border border-green-200";
      } else {
        elements.loadStatus.textContent = "";
        elements.loadStatus.className = "";
      }
    }
  },

  resetSelectedSubjectsTable() {
    if (elements.selectedSubjectsTable) {
      elements.selectedSubjectsTable.innerHTML = `
      <tr class="placeholder-row">
        <td colspan="9" class="py-8 text-center text-gray-500">
          No subjects selected. Please select a department and a year level.
        </td>
      </tr>`;
    }
    this.updateSummary();
  }
};
