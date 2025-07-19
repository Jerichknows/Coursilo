// ============ SUBJECT TYPE MANAGEMENT ============

// Fetch all subject types
async function fetchSubjectTypes() {
  try {
    const response = await fetch('/subject-types');
    if (!response.ok) throw new Error('Failed to fetch subject types');
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Render subject types in the table
async function loadSubjectTypes() {
  const tableBody = document.querySelector('#subjectTypesTableBody');
  tableBody.innerHTML = '';

  const types = await fetchSubjectTypes();
  types.forEach(type => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${type.id}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${type.name}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <a href="#" class="text-blue-600 hover:text-blue-900 mr-3" data-id="${type.id}">Edit</a>
        <a href="#" class="text-red-600 hover:text-red-900 delete-subject-type" data-id="${type.id}">Delete</a>
      </td>
    `;
    tableBody.appendChild(row);
  });

  addDeleteListeners();
}

// Add new subject type
document.querySelector('#subjectTypeForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const input = document.querySelector('#subjectTypeInput');
  const name = input.value.trim();

  if (!name) return alert('Please enter a subject type name.');

  try {
    const res = await fetch('/subject-types', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name })
    });

    if (!res.ok) throw new Error('Failed to add subject type');
    input.value = '';
    await loadSubjectTypes();
  } catch (error) {
    console.error(error);
    alert('Error adding subject type');
  }
});

function addDeleteListeners() {
  document.querySelectorAll('.delete-subject-type').forEach(button => {
    button.addEventListener('click', async function (e) {
      e.preventDefault();
      const id = this.dataset.id;

      if (!confirm('Are you sure you want to delete this subject type?')) return;

      try {
        const res = await fetch(`/subject-types/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete subject type');
        await loadSubjectTypes();
      } catch (error) {
        console.error(error);
        alert('Error deleting subject type');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', loadSubjectTypes);

document.addEventListener('DOMContentLoaded', () => {
  const addSubjectModal = document.getElementById('addSubjectModal');
  const showAddSubjectBtn = document.getElementById('showAddSubjectBtn');
  const closeAddSubjectModal = document.getElementById('closeAddSubjectModal');
  const subjectForm = document.getElementById('subjectForm');
  const departmentSelect = document.getElementById('department_id');
  const subjectTypeSelect = document.getElementById('subject_type');

  // Show modal
  showAddSubjectBtn.addEventListener('click', () => {
    addSubjectModal.classList.remove('hidden');
    addSubjectModal.classList.add('flex');
  });

  // Close modal
  closeAddSubjectModal.addEventListener('click', () => {
    addSubjectModal.classList.add('hidden');
    addSubjectModal.classList.remove('flex');
    subjectForm.reset();
  });

  async function loadDepartments() {
    try {
      const res = await fetch('/get_departments_subject');
      if (!res.ok) throw new Error('Failed to load departments');
      const departments = await res.json();

      departmentSelect.innerHTML = '<option value="">Select a Department</option>';
      departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.department;
        departmentSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  }

  async function loadSubjectTypes() {
    try {
      const res = await fetch('/subject-types');
      if (!res.ok) throw new Error('Failed to load subject types');
      const types = await res.json();

      subjectTypeSelect.innerHTML = '<option value="">Select a Subject type</option>';
      types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        subjectTypeSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading subject types:', error);
    }
  }

  subjectForm.addEventListener('submit', async e => {
    e.preventDefault();

    const data = {
      subject_code: document.getElementById('subject_code').value.trim(),
      subject_name: document.getElementById('subject_name').value.trim(),
      year_level: document.getElementById('year_level').value,
      department_id: departmentSelect.value,
      lecture: parseInt(document.getElementById('lecture').value) || 0,
      com_lab: parseInt(document.getElementById('com_lab').value) || 0,
      laboratory: parseInt(document.getElementById('laboratory').value) || 0,
      school_lecture: parseInt(document.getElementById('school_lecture').value) || 0,
      clinic: parseInt(document.getElementById('clinic').value) || 0,
      subject_type_id: subjectTypeSelect.value,
      is_nstp: document.getElementById('is_nstp').checked
    };

    if (!data.subject_code || !data.subject_name || !data.year_level || !data.department_id || !data.subject_type_id) {
      alert('Please fill all required fields.');
      return;
    }

    try {
      const res = await fetch('/add_subject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        alert('Subject added successfully!');
        subjectForm.reset();
        addSubjectModal.classList.add('hidden');
        addSubjectModal.classList.remove('flex');

        await loadSubjectsByDepartment();  // 🔄 Reload table contents
      } else {
        alert(result.message || 'Error adding subject');
      }
    } catch (error) {
      alert('Network error or server error');
      console.error('Submit error:', error);
    }
  });

  loadDepartments();
  loadSubjectTypes();
  loadSubjectsByDepartment(); // 🔄 Initial load on page
});

// Input styling
const inputClass = "border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5";
document.querySelectorAll('.input-field').forEach(el => el.className = inputClass);

// Load and display department-subject tables
async function loadSubjectsByDepartment() {
  try {
    const res = await fetch('/subjects_by_department');
    if (!res.ok) throw new Error('Failed to load subjects');

    const data = await res.json();
    const container = document.getElementById('departmentTablesContainer');
    container.innerHTML = '';

    data.departments.forEach(dept => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide p-4';

      let tableHTML = `
        <div class="rounded border border-gray-200 bg-white p-4 shadow-sm">
          <h3 class="text-lg font-semibold mb-2">${dept.name}</h3>
          <table class="w-full table-auto text-sm text-left text-gray-700">
            <thead class="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th class="px-3 py-2">Code</th>
                <th class="px-3 py-2">Name</th>
                <th class="px-3 py-2">Year</th>
                <th class="px-3 py-2">Lecture</th>
                <th class="px-3 py-2">Comp Lab</th>
                <th class="px-3 py-2">Laboratory</th>
                <th class="px-3 py-2">CL</th>
                <th class="px-3 py-2">C</th>
                <th class="px-3 py-2">Total Units</th>
                <th class="px-3 py-2">Type</th>
                <th class="px-3 py-2">NSTP</th>
                <th class="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
      `;

      // Update the row generation in the same function
      dept.subjects.forEach(subject => {
        // Calculate total units
        const totalUnits = (parseInt(subject.lecture) || 0) +
                          (parseInt(subject.comb_lab) || 0) +
                          (parseInt(subject.laboratory) || 0) +
                          (parseInt(subject.school_lecture) || 0) +
                          (parseInt(subject.clinic) || 0);

        tableHTML += `
          <tr class="border-t">
            <td class="px-3 py-2">${subject.subject_code}</td>
            <td class="px-3 py-2">${subject.subject_name}</td>
            <td class="px-3 py-2">${subject.year_level}</td>
            <td class="px-3 py-2">${subject.lecture}</td>
            <td class="px-3 py-2">${subject.comb_lab}</td>
            <td class="px-3 py-2">${subject.laboratory}</td>
            <td class="px-3 py-2">${subject.school_lecture}</td>
            <td class="px-3 py-2">${subject.clinic}</td>
            <td class="px-3 py-2 font-medium text-center">${totalUnits}</td>
            <td class="px-3 py-2">${subject.subject_type}</td>
            <td class="px-3 py-2">${subject.is_nstp ? 'Yes' : 'No'}</td>
            <td class="px-3 py-2">
              <button class="text-blue-600 hover:underline edit-subject-btn mr-2" data-code="${subject.subject_code}">
                <i data-lucide="pen" class="h-4 w-4"></i>
              </button>
              <button class="text-red-600 hover:underline delete-subject-btn" data-code="${subject.subject_code}">
                <i data-lucide="trash-2" class="h-4 w-4"></i>
              </button>
            </td>
          </tr>
        `;
      });

      tableHTML += `</tbody></table></div>`;
      slide.innerHTML = tableHTML;
      container.appendChild(slide);
    });

    // Initialize or update Swiper
    if (window.mySwiper) {
      window.mySwiper.update();
    } else {
      window.mySwiper = new Swiper('.mySwiper', {
        slidesPerView: 1,
        spaceBetween: 30,
        pagination: { el: '.swiper-pagination', clickable: true },
      });
    }

  } catch (error) {
    console.error('Error loading department subjects:', error);
  }
}

// Attach global event listener using event delegation
document.addEventListener('click', async function (e) {
  if (e.target && e.target.classList.contains('delete-subject-btn')) {
    const subjectCode = e.target.getAttribute('data-code');

    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      const res = await fetch(`/delete_subject/${subjectCode}`, { method: 'DELETE' });
      const result = await res.json();

      if (result.success) {
        alert('Subject deleted successfully!');
        await loadSubjectsByDepartment(); // Reload the table
      } else {
        alert(result.message || 'Failed to delete subject.');
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('An error occurred while deleting the subject.');
    }
  }
});

// Initial load
loadSubjectsByDepartment();

document.addEventListener('DOMContentLoaded', function() {
// Initialize Lucide icons
lucide.createIcons();

// Modal elements
const createUserBtn = document.getElementById('createUserBtn');
const createUserModal = document.getElementById('createUserModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelCreateBtn = document.getElementById('cancelCreateBtn');
const userForm = document.getElementById('userForm');
const userTypeSelect = document.getElementById('userType');
const departmentField = document.getElementById('departmentField');
const programsField = document.getElementById('programsField');

// Show modal when Create User button is clicked
createUserBtn.addEventListener('click', function() {
  createUserModal.classList.remove('hidden');
  loadDepartments();
});

// Close modal
function closeModal() {
  createUserModal.classList.add('hidden');
  userForm.reset();
  departmentField.classList.add('hidden');
  programsField.classList.add('hidden');
}

closeModalBtn.addEventListener('click', closeModal);
cancelCreateBtn.addEventListener('click', closeModal);

// Show/hide department and programs fields based on role selection
userTypeSelect.addEventListener('change', function() {
  const role = this.value;

  if (role === 'dean' || role === 'program-head') {
    departmentField.classList.remove('hidden');
    loadDepartments();

    if (role === 'program-head') {
      programsField.classList.remove('hidden');
      loadPrograms();
    } else {
      programsField.classList.add('hidden');
    }
  } else {
    departmentField.classList.add('hidden');
    programsField.classList.add('hidden');
  }
});

// Load departments for dropdown
function loadDepartments() {
  fetch('/get_departments')
    .then(response => response.json())
    .then(departments => {
      const departmentSelect = document.getElementById('department');
      departmentSelect.innerHTML = '<option value="">Select Department</option>';

      departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.department;
        departmentSelect.appendChild(option);
      });
    });
}

// Load programs as checkboxes
function loadPrograms() {
  fetch('/get_programs')
    .then(response => response.json())
    .then(programs => {
      const container = document.getElementById('programsCheckboxContainer');
      container.innerHTML = '';

      programs.forEach(program => {
        const div = document.createElement('div');
        div.className = 'flex items-center';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `program-${program.id}`;
        checkbox.name = 'programs';
        checkbox.value = program.id;
        checkbox.className = 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded';

        const label = document.createElement('label');
        label.htmlFor = `program-${program.id}`;
        label.className = 'ml-2 text-sm text-gray-700';
        label.textContent = `${program.program_code} - ${program.program_name}`;

        div.appendChild(checkbox);
        div.appendChild(label);
        container.appendChild(div);
      });
    });
}

// Update form submission handler
userForm.addEventListener('submit', function(e) {
  e.preventDefault();

  // Get selected program IDs
  const selectedPrograms = Array.from(
    document.querySelectorAll('#programsCheckboxContainer input[type="checkbox"]:checked')
  ).map(checkbox => checkbox.value);

  const formData = {
    first_name: document.getElementById('firstName').value,
    last_name: document.getElementById('lastName').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    user_type: document.getElementById('userType').value,
    department_id: document.getElementById('userType').value === 'dean' ||
                   document.getElementById('userType').value === 'program-head'
                   ? document.getElementById('department').value : null,
    programs: selectedPrograms.join(',')
  };

  fetch('/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('User created successfully!');
      closeModal();
      loadUsers(); // Refresh the users table
    } else {
      alert('Error creating user: ' + (data.message || 'Unknown error'));
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Error creating user');
  });
});

// Combined loadUsers function with all features
function loadUsers() {
  // First check if current user is default admin
  fetch('/current_user')
    .then(response => response.json())
    .then(currentUserData => {
      const isDefaultAdmin = currentUserData.user && currentUserData.user.email === 'admin.admin@gmail.com';

      // Then fetch all users
      fetch('/users')
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            const usersTableBody = document.getElementById('usersTableBody');
            usersTableBody.innerHTML = '';

            data.users.forEach(user => {
              const row = document.createElement('tr');

              // Name column
              const nameCell = document.createElement('td');
              nameCell.className = 'px-6 py-4 whitespace-nowrap';
              nameCell.innerHTML = `
                <div class="flex items-center">
                  <div class="ml-2">
                    <div class="text-sm font-medium text-gray-900">${user.first_name} ${user.last_name}</div>
                  </div>
                </div>
              `;

              // Email column
              const emailCell = document.createElement('td');
              emailCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
              emailCell.textContent = user.email;

              // Role column
              const roleCell = document.createElement('td');
              roleCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
              roleCell.textContent = user.user_type;

              // Status column
              const statusCell = document.createElement('td');
              statusCell.className = 'px-6 py-4 whitespace-nowrap';
              const statusBadge = document.createElement('span');
              statusBadge.className = `px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`;
              statusBadge.textContent = user.is_active ? 'Active' : 'Inactive';
              statusCell.appendChild(statusBadge);

              // Actions column
              const actionsCell = document.createElement('td');
              actionsCell.className = 'px-6 py-4 whitespace-nowrap text-sm font-medium';

              // Create action buttons container
              const actionsDiv = document.createElement('div');
              actionsDiv.className = 'flex space-x-2';

              // Edit button (visible to all admins)
              if (isDefaultAdmin) {
              const editBtn = document.createElement('button');
              editBtn.className = 'text-blue-600 hover:text-blue-900';
              editBtn.innerHTML = '<i data-lucide="pen" class="h-4 w-4"></i>';
              editBtn.addEventListener('click', () => editUser(user.id));
              }

              // Delete button (only visible to default admin)
              if (isDefaultAdmin) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'text-red-600 hover:text-red-900';
                deleteBtn.innerHTML = '<i data-lucide="trash-2" class="h-4 w-4"></i>';
                deleteBtn.addEventListener('click', () => deleteUser(user.id, user.email));
                actionsDiv.appendChild(deleteBtn);
              }

              actionsDiv.appendChild(editBtn);
              actionsCell.appendChild(actionsDiv);

              // Add all cells to row
              row.appendChild(nameCell);
              row.appendChild(emailCell);
              row.appendChild(roleCell);
              row.appendChild(statusCell);
              row.appendChild(actionsCell);

              usersTableBody.appendChild(row);
            });

            // Refresh Lucide icons after adding new ones
            lucide.createIcons();
          } else {
            alert(data.message || 'Failed to load users');
          }
        })
        .catch(error => {
          console.error('Error loading users:', error);
          alert('An error occurred while loading users');
        });
    })
    .catch(error => {
      console.error('Error checking current user:', error);
    });
}

// Delete user function with protection for default admin
function deleteUser(userId, userEmail) {
  const DEFAULT_ADMIN_EMAIL = 'admin.admin@gmail.com';

  if (userEmail === DEFAULT_ADMIN_EMAIL) {
    alert('Cannot delete the default admin account');
    return;
  }

  if (confirm('Are you sure you want to delete this user?')) {
    fetch(`/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include' // Important for session-based auth
    })
    .then(response => {
      if (response.status === 403) {
        return response.json().then(data => {
          throw new Error(data.message);
        });
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        alert('User deleted successfully');
        loadUsers(); // Refresh the users table
      } else {
        alert(data.message || 'Failed to delete user');
      }
    })
    .catch(error => {
      alert(error.message || 'Error deleting user');
    });
  }
}

// Search functionality
document.getElementById('searchUser').addEventListener('input', function(e) {
  const searchTerm = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('#usersTableBody tr');

  rows.forEach(row => {
    const name = row.cells[0].textContent.toLowerCase();
    const email = row.cells[1].textContent.toLowerCase();
    const role = row.cells[2].textContent.toLowerCase();

    if (name.includes(searchTerm) || email.includes(searchTerm) || role.includes(searchTerm)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
});
});

// Delete user function with protection for default admin
function deleteUser(userId, userEmail) {
// Default admin credentials
const DEFAULT_ADMIN_EMAIL = 'admin.admin@gmail.com';

if (userEmail === DEFAULT_ADMIN_EMAIL) {
  alert('Cannot delete the default admin account');
  return;
}

if (confirm('Are you sure you want to delete this user?')) {
  fetch(`/users/${userId}`, {
    method: 'DELETE'
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('User deleted successfully');
      // Refresh the users table
      document.dispatchEvent(new Event('DOMContentLoaded'));
    } else {
      alert('Error deleting user: ' + (data.message || 'Unknown error'));
    }
  });
}
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
// Initialize Lucide icons
lucide.createIcons();

// Load users
loadUsers();

// Check if current user is default admin to show/hide create button
fetch('/current_user')
  .then(response => response.json())
  .then(data => {
    if (data.success && data.user) {
      const DEFAULT_ADMIN_EMAIL = "admin.admin@gmail.com";
      const createUserBtn = document.getElementById('createUserBtn');

      if (data.user.email !== DEFAULT_ADMIN_EMAIL && createUserBtn) {
        createUserBtn.style.display = 'none';
      }
    }
  });
});
// Fetch and display users from backend with delete button for admin
async function loadUsers() {
try {
  // First check if current user is default admin
  const currentUserRes = await fetch('/current_user');
  const currentUserData = await currentUserRes.json();
  const isDefaultAdmin = currentUserData.user && currentUserData.user.email === 'admin.admin@gmail.com';

  // Then fetch all users
  const res = await fetch("/users");
  const data = await res.json();

  if (data.success) {
    const usersTableBody = document.getElementById("usersTableBody");
    usersTableBody.innerHTML = ''; // Clear existing rows

    data.users.forEach(user => {
      const row = document.createElement('tr');

      // Create table cells
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="ml-2">
              <div class="text-sm font-medium text-gray-900">${user.first_name} ${user.last_name}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.user_type}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
            ${user.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div class="flex space-x-2">
          ${isDefaultAdmin ? `
            <button onclick="editUser('${user.id}')" class="text-blue-600 hover:text-blue-900">
              <i data-lucide="pen" class="h-4 w-4"></i>
            </button>
            ` : ''}
            ${isDefaultAdmin ? `
              <button onclick="deleteUser('${user.id}', '${user.email}')" class="text-red-600 hover:text-red-900">
                <i data-lucide="trash-2" class="h-4 w-4"></i>
              </button>
            ` : ''}
          </div>
        </td>
      `;
      usersTableBody.appendChild(row);
    });

    // Refresh Lucide icons
    lucide.createIcons();
  } else {
    alert(data.message);
  }
} catch (error) {
  console.error("Error:", error);
  alert("An error occurred while loading users.");
}
}

// Delete user function with protection for default admin
function deleteUser(userId, userEmail) {
const DEFAULT_ADMIN_EMAIL = 'admin.admin@gmail.com';

if (userEmail === DEFAULT_ADMIN_EMAIL) {
  alert('Cannot delete the default admin account');
  return;
}

if (confirm('Are you sure you want to delete this user?')) {
  fetch(`/users/${userId}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  .then(response => {
    if (response.status === 403) {
      throw new Error('Only default admin can delete users');
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      alert('User deleted successfully');
      loadUsers(); // Refresh the table
    } else {
      alert(data.message || 'Failed to delete user');
    }
  })
  .catch(error => {
    alert(error.message || 'Error deleting user');
  });
}
}

// Load users when the page loads
document.addEventListener("DOMContentLoaded", loadUsers);

document.getElementById('logoutBtn').addEventListener('click', function() {
// Clear any client-side storage
localStorage.clear();
sessionStorage.clear();

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

      // Set user role - This is the key fix
      document.getElementById('userRole').textContent = user.user_type.toLowerCase();

      // Get references to all info sections
      const departmentInfo = document.getElementById('departmentInfo');
      const departmentName = document.getElementById('departmentName');
      const programsInfo = document.getElementById('programsInfo');
      const programsList = document.getElementById('programsList');

      // Clear existing programs
      programsList.innerHTML = '';

      // Role-based display logic
      switch(user.user_type.toLowerCase()) {
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

        default:
          // Default case (shouldn't happen)
          departmentInfo.classList.add('hidden');
          programsInfo.classList.add('hidden');
      }
    }
  })
  .catch(error => {
    console.error('Error fetching user data:', error);
  });
});

document.addEventListener('DOMContentLoaded', function() {
  const auditLogsContainer = document.getElementById('auditLogs');
  const logsTableBody = auditLogsContainer.querySelector('tbody');

  // Format date in GMT+8 (Philippine Time)
  function formatGMT8(isoString) {
      const options = {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Manila'
      };
      return new Date(isoString).toLocaleString('en-PH', options);
  }

  // Fetch audit logs
  async function fetchAuditLogs(page = 1) {
      try {
          const response = await fetch(`/api/audit-logs?page=${page}`);
          const data = await response.json();

          if (data.success) {
              renderAuditLogs(data.logs);
              renderPagination(data);
          } else {
              showAlert('Error loading logs: ' + data.message, 'error');
          }
      } catch (error) {
          showAlert('Network error: ' + error.message, 'error');
      }
  }

  // Render logs in table
  function renderAuditLogs(logs) {
      logsTableBody.innerHTML = '';

      if (!logs || logs.length === 0) {
          logsTableBody.innerHTML = `
              <tr>
                  <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                      No activity logs found
                  </td>
              </tr>
          `;
          return;
      }

      logs.forEach(log => {
          const row = document.createElement('tr');
          row.className = 'hover:bg-gray-50';

          row.innerHTML = `
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${formatGMT8(log.timestamp)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${log.user || 'System'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${log.action}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm ${
                  log.status === 'success' ? 'text-green-600' : 'text-red-600'
              }">
                  ${log.message || log.status}
              </td>
          `;

          row.addEventListener('click', () => showLogDetails(log));
          logsTableBody.appendChild(row);
      });
  }

  // Show log details modal with GMT+8 time
  function showLogDetails(log) {
      const modalHtml = `
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div class="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
                  <div class="p-6">
                      <div class="flex justify-between items-center mb-4">
                          <h3 class="text-lg font-semibold">Log Details</h3>
                          <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                              <i data-lucide="x" class="h-5 w-5"></i>
                          </button>
                      </div>

                      <div class="space-y-4">
                          <div class="grid grid-cols-2 gap-4">
                              <div>
                                  <p class="text-sm text-gray-500">Timestamp (GMT+8)</p>
                                  <p class="text-sm">${formatGMT8(log.timestamp)}</p>
                              </div>
                              <div>
                                  <p class="text-sm text-gray-500">User</p>
                                  <p class="text-sm">${log.user || 'System'}</p>
                              </div>
                          </div>

                          <div>
                              <p class="text-sm text-gray-500">Action</p>
                              <p class="text-sm">${log.action}</p>
                          </div>

                          <div>
                              <p class="text-sm text-gray-500">Status</p>
                              <p class="text-sm ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}">
                                  ${log.status}
                              </p>
                          </div>

                          ${log.ip_address ? `
                          <div>
                              <p class="text-sm text-gray-500">IP Address</p>
                              <p class="text-sm">${log.ip_address}</p>
                          </div>` : ''}

                          ${log.metadata ? `
                          <div>
                              <p class="text-sm text-gray-500">Details</p>
                              <pre class="text-sm bg-gray-50 p-2 rounded overflow-auto">${JSON.stringify(JSON.parse(log.metadata), null, 2)}</pre>
                          </div>` : ''}
                      </div>
                  </div>
              </div>
          </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);
      refreshLucideIcons();
  }

  // Rest of the code remains the same...
  function renderPagination(data) {
      const paginationContainer = document.createElement('div');
      paginationContainer.className = 'px-6 py-4 flex items-center justify-between border-t border-gray-200';

      if (data.pages <= 1) return;

      paginationContainer.innerHTML = `
          <div class="flex-1 flex justify-between items-center">
              <button
                  ${data.current_page === 1 ? 'disabled' : ''}
                  onclick="fetchAuditLogs(${data.current_page - 1})"
                  class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${data.current_page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}">
                  Previous
              </button>
              <div class="text-sm text-gray-700">
                  Page ${data.current_page} of ${data.pages}
              </div>
              <button
                  ${data.current_page === data.pages ? 'disabled' : ''}
                  onclick="fetchAuditLogs(${data.current_page + 1})"
                  class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${data.current_page === data.pages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}">
                  Next
              </button>
          </div>
      `;

      const existingPagination = auditLogsContainer.querySelector('.pagination-container');
      if (existingPagination) existingPagination.remove();

      const container = document.createElement('div');
      container.className = 'pagination-container';
      container.appendChild(paginationContainer);
      auditLogsContainer.querySelector('.rounded-lg').appendChild(container);
  }

  // Initial fetch
  fetchAuditLogs();
  window.fetchAuditLogs = fetchAuditLogs;
});

function refreshLucideIcons() {
  if (window.lucide) {
      window.lucide.createIcons();
  }
}

function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg ${type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
  alertDiv.textContent = message;
  document.body.appendChild(alertDiv);

  setTimeout(() => {
      alertDiv.remove();
  }, 5000);
}
// ======================
// GLOBAL EDIT FUNCTIONALITY
// ======================

// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', function() {
lucide.createIcons();
});

// Global edit modal container
const editModal = document.createElement('div');
editModal.id = 'editModal';
editModal.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-black bg-opacity-50';
editModal.innerHTML = `
<div class="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
  <button id="closeEditModal" class="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-xl font-bold">&times;</button>
  <div id="editModalContent" class="p-4"></div>
</div>
`;
document.body.appendChild(editModal);

// Close modal handlers
document.getElementById('closeEditModal')?.addEventListener('click', () => {
editModal.classList.add('hidden');
});

editModal.addEventListener('click', (e) => {
if (e.target === editModal) {
  editModal.classList.add('hidden');
}
});

// ======================
// DEPARTMENT EDIT FUNCTIONALITY
// ======================

function setupDepartmentEdit() {
const editButtons = document.querySelectorAll('[data-department-id]');

editButtons.forEach(button => {
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    const departmentId = button.getAttribute('data-department-id');

    try {
      // Fetch department data
      const response = await fetch(`/api/departments/${departmentId}`);
      const department = await response.json();

      // Populate edit form
      const editForm = `
        <div class="mb-4">
          <h3 class="text-lg font-semibold mb-4">Edit Department</h3>
          <form id="departmentEditForm" class="space-y-4">
            <input type="hidden" name="id" value="${department.id}">

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Department Code</label>
              <input type="text" name="code" value="${department.department_code}"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
              <input type="text" name="name" value="${department.department}"
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
      document.getElementById('departmentEditForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
          const response = await fetch(`/api/departments/${departmentId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
          });

          const result = await response.json();

          if (result.success) {
            alert('Department updated successfully!');
            editModal.classList.add('hidden');
            loadDepartments(); // Refresh department list
          } else {
            alert(result.message || 'Failed to update department');
          }
        } catch (error) {
          console.error('Error updating department:', error);
          alert('An error occurred while updating the department');
        }
      });

    } catch (error) {
      console.error('Error fetching department:', error);
      alert('Failed to load department data');
    }
  });
});
}
