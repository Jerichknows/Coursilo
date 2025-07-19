// ======================
// PROGRAM EDIT FUNCTIONALITY
// ======================

function setupProgramEdit() {
  const editButtons = document.querySelectorAll('[data-program-id]');

  editButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      const programId = button.getAttribute('data-program-id');

      try {
        // Fetch program data
        const response = await fetch(`/api/programs/${programId}`);
        const program = await response.json();

        // Fetch departments for dropdown
        const deptResponse = await fetch('/api/departments');
        const departments = await deptResponse.json();

        // Populate edit form
        let deptOptions = '';
        departments.forEach(dept => {
          deptOptions += `<option value="${dept.id}" ${dept.id === program.department_id ? 'selected' : ''}>${dept.department} (${dept.department_code})</option>`;
        });

        const editForm = `
          <div class="mb-4">
            <h3 class="text-lg font-semibold mb-4">Edit Program</h3>
            <form id="programEditForm" class="space-y-4">
              <input type="hidden" name="id" value="${program.id}">

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Program Code</label>
                <input type="text" name="code" value="${program.program_code}"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                <input type="text" name="name" value="${program.program_name}"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select name="department_id" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                  <option value="">Select Department</option>
                  ${deptOptions}
                </select>
              </div>

              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" onclick="editModal.classList.add('hidden')"
                  class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Cancel
                </button>
                <button type="submit"
                  class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        `;

        document.getElementById('editModalContent').innerHTML = editForm;
        editModal.classList.remove('hidden');

        // Handle form submission
        document.getElementById('programEditForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData.entries());

          try {
            const response = await fetch(`/api/programs/${programId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
              alert('Program updated successfully!');
              editModal.classList.add('hidden');
              loadPrograms(); // Refresh program list
            } else {
              alert(result.message || 'Failed to update program');
            }
          } catch (error) {
            console.error('Error updating program:', error);
            alert('An error occurred while updating the program');
          }
        });

      } catch (error) {
        console.error('Error fetching program:', error);
        alert('Failed to load program data');
      }
    });
  });
}

// ======================
// SUBJECT TYPE EDIT FUNCTIONALITY
// ======================

function setupSubjectTypeEdit() {
  const editButtons = document.querySelectorAll('[data-subject-type-id]');

  editButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      const subjectTypeId = button.getAttribute('data-subject-type-id');

      try {
        // Fetch subject type data
        const response = await fetch(`/api/subject-types/${subjectTypeId}`);
        const subjectType = await response.json();

        // Populate edit form
        const editForm = `
          <div class="mb-4">
            <h3 class="text-lg font-semibold mb-4">Edit Subject Type</h3>
            <form id="subjectTypeEditForm" class="space-y-4">
              <input type="hidden" name="id" value="${subjectType.id}">

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Subject Type Name</label>
                <input type="text" name="name" value="${subjectType.name}"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
              </div>

              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" onclick="editModal.classList.add('hidden')"
                  class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Cancel
                </button>
                <button type="submit"
                  class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        `;

        document.getElementById('editModalContent').innerHTML = editForm;
        editModal.classList.remove('hidden');

        // Handle form submission
        document.getElementById('subjectTypeEditForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData.entries());

          try {
            const response = await fetch(`/api/subject-types/${subjectTypeId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
              alert('Subject type updated successfully!');
              editModal.classList.add('hidden');
              loadSubjectTypes(); // Refresh subject type list
            } else {
              alert(result.message || 'Failed to update subject type');
            }
          } catch (error) {
            console.error('Error updating subject type:', error);
            alert('An error occurred while updating the subject type');
          }
        });

      } catch (error) {
        console.error('Error fetching subject type:', error);
        alert('Failed to load subject type data');
      }
    });
  });
}

// ======================
// SUBJECT EDIT FUNCTIONALITY
// ======================

function setupSubjectEdit() {
  const editButtons = document.querySelectorAll('[data-subject-id]');

  editButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      const subjectId = button.getAttribute('data-subject-id');

      try {
        // Fetch subject data
        const response = await fetch(`/api/subjects/${subjectId}`);
        const subject = await response.json();

        // Fetch departments and subject types for dropdowns
        const [deptResponse, typeResponse] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/subject-types')
        ]);

        const departments = await deptResponse.json();
        const subjectTypes = await typeResponse.json();

        // Populate edit form
        let deptOptions = '';
        departments.forEach(dept => {
          deptOptions += `<option value="${dept.id}" ${dept.id === subject.department_id ? 'selected' : ''}>${dept.department} (${dept.department_code})</option>`;
        });

        let typeOptions = '';
        subjectTypes.forEach(type => {
          typeOptions += `<option value="${type.id}" ${type.id === subject.subject_type_id ? 'selected' : ''}>${type.name}</option>`;
        });

        const editForm = `
          <div class="mb-4">
            <h3 class="text-lg font-semibold mb-4">Edit Subject</h3>
            <form id="subjectEditForm" class="space-y-4">
              <input type="hidden" name="id" value="${subject.id}">

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                  <input type="text" name="code" value="${subject.subject_code}"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                  <input type="text" name="name" value="${subject.subject_name}"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
                  <select name="year_level" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Select Year Level</option>
                    <option value="1st year" ${subject.year_level === '1st year' ? 'selected' : ''}>1st Year</option>
                    <option value="2nd year" ${subject.year_level === '2nd year' ? 'selected' : ''}>2nd Year</option>
                    <option value="3rd year" ${subject.year_level === '3rd year' ? 'selected' : ''}>3rd Year</option>
                    <option value="4th year" ${subject.year_level === '4th year' ? 'selected' : ''}>4th Year</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select name="department_id" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Select Department</option>
                    ${deptOptions}
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Lecture Hours</label>
                  <input type="number" name="lecture" value="${subject.lecture}"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Computer Lab Hours</label>
                  <input type="number" name="com_lab" value="${subject.com_lab}"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Lab Hours</label>
                  <input type="number" name="laboratory" value="${subject.laboratory}"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">CL Hours</label>
                  <input type="number" name="school_lecture" value="${subject.school_lecture}"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">C Hours</label>
                  <input type="number" name="clinic" value="${subject.clinic}"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Total Units</label>
                    <input type="text" id="edit_total_units" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100" readonly>
                  </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Subject Type</label>
                  <select name="subject_type_id" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Select Subject Type</option>
                    ${typeOptions}
                  </select>
                </div>
              </div>

              <div class="flex items-center">
                <input type="checkbox" name="is_nstp" id="is_nstp" ${subject.is_nstp ? 'checked' : ''}
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                <label for="is_nstp" class="ml-2 text-sm font-medium text-gray-700">NSTP Subject</label>
              </div>

              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" onclick="editModal.classList.add('hidden')"
                  class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Cancel
                </button>
                <button type="submit"
                  class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        `;

        document.getElementById('editModalContent').innerHTML = editForm;
        editModal.classList.remove('hidden');

        // Handle form submission
        document.getElementById('subjectEditForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData.entries());
          data.is_nstp = document.getElementById('is_nstp').checked;

          try {
            const response = await fetch(`/api/subjects/${subjectId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
              alert('Subject updated successfully!');
              editModal.classList.add('hidden');
              loadSubjectsByDepartment(); // Refresh subject list
            } else {
              alert(result.message || 'Failed to update subject');
            }
          } catch (error) {
            console.error('Error updating subject:', error);
            alert('An error occurred while updating the subject');
          }
        });

      } catch (error) {
        console.error('Error fetching subject:', error);
        alert('Failed to load subject data');
      }
    });
  });
}

// ======================
// USER EDIT FUNCTIONALITY
// ======================

// Simplified edit user function
async function editUser(userId) {
  try {
    // Fetch user data
    const response = await fetch(`/api/users/${userId}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch user');
    }

    const user = result.user;

    // Populate form fields
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editFirstName').value = user.first_name;
    document.getElementById('editLastName').value = user.last_name;
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editUserType').value = user.user_type;
    document.getElementById('editStatus').value = user.is_active ? 'active' : 'inactive';

    // Show/hide department and programs fields based on role
    const role = user.user_type;
    const deptField = document.getElementById('editDepartmentField');
    const programsField = document.getElementById('editProgramsField');

    if (role === 'dean' || role === 'program-head') {
      deptField.classList.remove('hidden');
      await loadDepartmentsForEdit(user.department_id);

      if (role === 'program-head') {
        programsField.classList.remove('hidden');
        await loadProgramsForEdit(user.id, user.programs);
      } else {
        programsField.classList.add('hidden');
      }
    } else {
      deptField.classList.add('hidden');
      programsField.classList.add('hidden');
    }

    // Show modal
    document.getElementById('editUserModal').classList.remove('hidden');

    // Handle role change in edit form
    document.getElementById('editUserType').addEventListener('change', function() {
      const newRole = this.value;

      if (newRole === 'dean' || newRole === 'program-head') {
        deptField.classList.remove('hidden');
        loadDepartmentsForEdit();

        if (newRole === 'program-head') {
          programsField.classList.remove('hidden');
          loadProgramsForEdit(userId);
        } else {
          programsField.classList.add('hidden');
        }
      } else {
        deptField.classList.add('hidden');
        programsField.classList.add('hidden');
      }
    });

  } catch (error) {
    console.error('Error:', error);
    alert('Failed to load user data');
  }
}

// Helper function to load departments for edit form
async function loadDepartmentsForEdit(selectedId = null) {
  try {
    const response = await fetch('/api/departments');
    const result = await response.json();

    if (!result.success) throw new Error(result.message);

    const select = document.getElementById('editDepartment');
    select.innerHTML = '<option value="">Select Department</option>';

    result.departments.forEach(dept => {
      const option = document.createElement('option');
      option.value = dept.id;
      option.textContent = dept.department;
      if (selectedId && dept.id == selectedId) option.selected = true;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading departments:', error);
  }
}

// Helper function to load programs for edit form
async function loadProgramsForEdit(userId, currentPrograms = '') {
  try {
    const response = await fetch('/api/programs');
    const result = await response.json();

    if (!result.success) throw new Error(result.message);

    // If current programs not provided, fetch them
    if (!currentPrograms) {
      const userProgsResponse = await fetch(`/api/users/${userId}/programs`);
      const userProgsResult = await userProgsResponse.json();
      currentPrograms = userProgsResult.programs || [];
    } else if (typeof currentPrograms === 'string') {
      // Handle case where currentPrograms is a comma-separated string
      currentPrograms = currentPrograms.split(',').map(id => id.trim());
    }

    const container = document.getElementById('editProgramsCheckboxContainer');
    container.innerHTML = '';

    result.programs.forEach(program => {
      const div = document.createElement('div');
      div.className = 'flex items-center';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `edit-program-${program.id}`;
      checkbox.name = 'programs';
      checkbox.value = program.id;
      checkbox.className = 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded';

      // Check if program is assigned to user
      if (currentPrograms.some(p => p.id === program.id || p == program.id)) {
        checkbox.checked = true;
      }

      const label = document.createElement('label');
      label.htmlFor = `edit-program-${program.id}`;
      label.className = 'ml-2 text-sm text-gray-700';
      label.textContent = `${program.program_code} - ${program.program_name}`;

      div.appendChild(checkbox);
      div.appendChild(label);
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading programs:', error);
  }
}
// Handle edit form submission
document.getElementById('editUserForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const formData = {
    id: document.getElementById('editUserId').value,
    first_name: document.getElementById('editFirstName').value,
    last_name: document.getElementById('editLastName').value,
    email: document.getElementById('editEmail').value,
    user_type: document.getElementById('editUserType').value,
    is_active: document.getElementById('editStatus').value === 'active',
    department_id: null,
    programs: null
  };

  // Get department if role is dean or program-head
  if (formData.user_type === 'dean' || formData.user_type === 'program-head') {
    formData.department_id = document.getElementById('editDepartment').value;
  }

  // Get selected programs if role is program-head and convert to comma-separated string
  if (formData.user_type === 'program-head') {
    const checkboxes = document.querySelectorAll('#editProgramsCheckboxContainer input[type="checkbox"]:checked');
    formData.programs = Array.from(checkboxes).map(cb => cb.value).join(',');
  }

  try {
    const response = await fetch(`/api/users/${formData.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (result.success) {
      alert('User updated successfully!');
      document.getElementById('editUserModal').classList.add('hidden');
      loadUsers(); // Refresh the users table
    } else {
      alert(result.message || 'Failed to update user');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to update user');
  }
});

// Close modal handlers
document.getElementById('closeEditModalBtn').addEventListener('click', function() {
  document.getElementById('editUserModal').classList.add('hidden');
});

document.getElementById('cancelEditBtn').addEventListener('click', function() {
  document.getElementById('editUserModal').classList.add('hidden');
});

// Handle edit button clicks
document.addEventListener('click', async function(e) {
  const editBtn = e.target.closest('.edit-subject-btn');
  if (!editBtn) return;

  const subjectCode = editBtn.dataset.code;

  try {
    // Fetch subject data
    const response = await fetch(`/api/subjects/${subjectCode}`);
    const subject = await response.json();

    if (!response.ok) throw new Error(subject.message || 'Failed to fetch subject');

    // Populate form fields
    document.getElementById('edit_subject_code').value = subject.subject_code;
    document.getElementById('edit_subject_name').value = subject.subject_name;
    document.getElementById('edit_year_level').value = subject.year_level;
    document.getElementById('edit_lecture').value = subject.lecture;
    document.getElementById('edit_com_lab').value = subject.com_lab;
    document.getElementById('edit_laboratory').value = subject.laboratory;
    document.getElementById('edit_school_lecture').value = subject.school_lecture;
    document.getElementById('edit_clinic').value = subject.clinic;
    document.getElementById('edit_is_nstp').checked = subject.is_nstp;

    // Load departments and subject types
    const [depts, types] = await Promise.all([
      fetch('/get_departments_subject').then(r => r.json()),
      fetch('/subject-types').then(r => r.json())
    ]);

    // Populate departments dropdown
    const deptSelect = document.getElementById('edit_department_id');
    deptSelect.innerHTML = '<option value="">Select Department</option>';
    depts.forEach(dept => {
      const option = new Option(dept.department, dept.id);
      if (dept.id === subject.department_id) option.selected = true;
      deptSelect.add(option);
    });

    // Populate subject types dropdown
    const typeSelect = document.getElementById('edit_subject_type');
    typeSelect.innerHTML = '<option value="">Select Subject Type</option>';
    types.forEach(type => {
      const option = new Option(type.name, type.id);
      if (type.id === subject.subject_type_id) option.selected = true;
      typeSelect.add(option);
    });

    // Show modal
    document.getElementById('editSubjectModal').classList.remove('hidden');
    document.getElementById('editSubjectModal').classList.add('flex');

  } catch (error) {
    console.error('Error:', error);
    alert('Failed to load subject data');
  }
});
// Handle edit form submission
document.getElementById('editSubjectForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();

  const formData = {
    subject_code: document.getElementById('edit_subject_code').value,
    subject_name: document.getElementById('edit_subject_name').value,
    year_level: document.getElementById('edit_year_level').value,
    department_id: document.getElementById('edit_department_id').value,
    lecture: parseInt(document.getElementById('edit_lecture').value) || 0,
    com_lab: parseInt(document.getElementById('edit_com_lab').value) || 0,
    laboratory: parseInt(document.getElementById('edit_laboratory').value) || 0,
    school_lecture: parseInt(document.getElementById('edit_school_lecture').value) || 0,
    clinic: parseInt(document.getElementById('edit_clinic').value) || 0,
    subject_type_id: document.getElementById('edit_subject_type').value,
    is_nstp: document.getElementById('edit_is_nstp').checked
  };

  // Validate required fields
  if (!formData.subject_code || !formData.subject_name || !formData.year_level ||
      !formData.department_id || !formData.subject_type_id) {
    return alert('Please fill all required fields');
  }

  try {
    const response = await fetch(`/api/subjects/${formData.subject_code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert('Subject updated successfully!');
      document.getElementById('editSubjectModal').classList.add('hidden');
      document.getElementById('editSubjectModal').classList.remove('flex');
      loadSubjectsByDepartment(); // Refresh the table
    } else {
      alert(result.message || 'Error updating subject');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to update subject');
  }
});

// Close modal
document.getElementById('closeEditSubjectModal')?.addEventListener('click', function() {
  document.getElementById('editSubjectModal').classList.add('hidden');
  document.getElementById('editSubjectModal').classList.remove('flex');
});
