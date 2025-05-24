// Input styling
const inputClass = "border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5";
document.querySelectorAll('.input-field').forEach(el => el.className = inputClass);

function fetchSubjectsByDepartment() {
  fetch("/get_subjects")
    .then(response => response.json())
    .then(data => {
      const departments = {};
      data.forEach(subject => {
        const dept = subject.department?.trim();
        if (!dept) return;
        if (!departments[dept]) departments[dept] = [];
        departments[dept].push(subject);
      });

      const container = document.getElementById("departmentTablesContainer");
      container.innerHTML = "";

      const sortedDepartments = Object.keys(departments).sort();

      if (sortedDepartments.length === 0) {
        container.innerHTML = `<div class="swiper-slide text-center text-gray-500 mt-6">No subjects added yet.</div>`;
        return;
      }

      sortedDepartments.forEach(dept => {
        const subjects = departments[dept];
        const tableId = `subjectsTable-${dept}`;
        const slide = document.createElement("div");
        slide.className = "swiper-slide px-4";

        // Initialize totals for this department
        let totalUnits = 0;
        let totalLecture = 0;
        let totalComLab = 0;
        let totalLaboratory = 0;
        let totalSchoolLecture = 0;
        let totalClinic = 0;

        // Calculate totals for this department
        subjects.forEach(subject => {
          const lecture = parseFloat(subject.lecture) || 0;
          const comLab = parseFloat(subject.com_lab) || 0;
          const laboratory = parseFloat(subject.laboratory) || 0;
          const schoolLecture = parseFloat(subject.school_lecture) || 0;
          const clinic = parseFloat(subject.clinic) || 0;

          totalUnits += lecture + comLab + laboratory + schoolLecture + clinic;
          totalLecture += lecture;
          totalComLab += comLab;
          totalLaboratory += laboratory;
          totalSchoolLecture += schoolLecture;
          totalClinic += clinic;
        });

        slide.innerHTML = `
          <div class="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="p-6">
              <div class="mb-6 flex items-center gap-3">
                <i data-lucide="list" class="h-6 w-6 text-action"></i>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900">${dept} Subjects</h2>
                  <p class="text-sm text-gray-500">Subjects under the ${dept} department.</p>
                </div>
              </div>
              <div class="overflow-x-auto">
              <table class="w-full text-sm text-left text-gray-700 border">
                <thead>
                  <tr class="border-b bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <th class="p-3 font-medium border" colspan="5"></th>
                    <th class="p-3 text-center font-medium border" colspan="2">LAB</th>
                    <th class="p-3 text-center font-medium border" colspan="2">RLE</th>
                    <th class="p-3 font-medium border" colspan="3"></th>
                  </tr>
                  <tr class="border-b bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <th class="p-3 font-medium border">Subject Code</th>
                    <th class="p-3 font-medium border">Subject Name</th>
                    <th class="p-3 font-medium border">Year Level</th>
                    <th class="p-3 text-center font-medium border">Units</th>
                    <th class="p-3 text-center font-medium border">Lecture</th>
                    <th class="p-3 text-center font-medium border">Comp Laboratory</th>
                    <th class="p-3 text-center font-medium border">Science Laboratory</th>
                    <th class="p-3 text-center font-medium border">CL</th>
                    <th class="p-3 text-center font-medium border">C</th>
                    <th class="p-3 text-center font-medium border">Subject Type</th>
                    <th class="p-3 text-center font-medium border">NSTP</th>
                    <th class="p-3 text-right font-medium border">Actions</th>
                  </tr>
                </thead>
                <tbody id="${tableId}" class="border"></tbody>
                <tr class="border-b bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <th class="p-3 text-right font-medium border" colspan="3">Total Units</th>
                  <th class="p-3 text-center font-medium border">${totalUnits}</th>
                  <th class="p-3 text-center font-medium border">${totalLecture}</th>
                  <th class="p-3 text-center font-medium border">${totalComLab}</th>
                  <th class="p-3 text-center font-medium border">${totalLaboratory}</th>
                  <th class="p-3 text-center font-medium border">${totalSchoolLecture}</th>
                  <th class="p-3 text-center font-medium border">${totalClinic}</th>
                  <th class="p-3 text-center font-medium border" colspan="3"></th>
                </tr>
                </table>
              </div>
            </div>
          </div>
        `;

        container.appendChild(slide);
        const tbody = slide.querySelector(`#${tableId}`);

        subjects.forEach(subject => {
          const lecture = parseFloat(subject.lecture) || 0;
          const comLab = parseFloat(subject.com_lab) || 0;
          const laboratory = parseFloat(subject.laboratory) || 0;
          const schoolLecture = parseFloat(subject.school_lecture) || 0;
          const clinic = parseFloat(subject.clinic) || 0;
          const totalUnits = lecture + comLab + laboratory + schoolLecture + clinic;

          const row = document.createElement("tr");
          row.innerHTML = `
            <td class="p-3">${subject.subject_code}</td>
            <td class="p-3">${subject.subject_name}</td>
            <td class="p-3">${subject.year_level}</td>
            <td class="p-3 text-center">${totalUnits}</td>
            <td class="p-3 text-center">${lecture}</td>
            <td class="p-3 text-center">${comLab}</td>
            <td class="p-3 text-center">${laboratory}</td>
            <td class="p-3 text-center">${schoolLecture}</td>
            <td class="p-3 text-center">${clinic}</td>
            <td class="p-3 text-center">${subject.subject_type}</td>
            <td class="p-3 text-center">${subject.subject_nstp ? 'Yes' : 'No'}</td>
            <td class="p-3 text-center">
              <button onclick="deleteSubject(${subject.id})" class="text-red-600 hover:text-red-800">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </td>
          `;

          tbody.appendChild(row);
        });
      });

      lucide.createIcons();

      if (window.departmentSwiper) window.departmentSwiper.destroy(true, true);
      window.departmentSwiper = new Swiper(".mySwiper", {
        slidesPerView: 1,
        spaceBetween: 30,
        pagination: {
          el: ".swiper-pagination",
          clickable: true
        }
      });
    })
    .catch(err => console.error("Failed to load subjects:", err));
}

  function deleteSubject(id) {
    if (!confirm("Are you sure you want to delete this subject?")) return;
    fetch(`/delete_subject/${id}`, { method: "DELETE" })
      .then(res => {
        if (!res.ok) throw new Error("Delete failed");
        return res.json();
      })
      .then(() => fetchSubjectsByDepartment())
      .catch(err => {
        console.error("Error deleting:", err);
        alert("Failed to delete subject");
      });
  }

  document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    fetchSubjectsByDepartment();

    // Get the subject type dropdown and NSTP container
    const subjectTypeSelect = document.getElementById("subject_type");
    const nstpContainer = document.getElementById("nstpContainer");

    // Add event listener for subject type changes
    subjectTypeSelect.addEventListener("change", function() {
      if (this.value === "Minor/General Subject") {
        nstpContainer.classList.remove("hidden");
      } else {
        nstpContainer.classList.add("hidden");
        // Also uncheck the box when hiding
        document.getElementById("is_nstp").checked = false;
      }
    });
    document.getElementById("subjectForm").addEventListener("submit", (e) => {
      e.preventDefault();

      const subjectData = {
        subject_code: document.getElementById("subject_code").value.trim(),
        subject_name: document.getElementById("subject_name").value.trim(),
        year_level: document.getElementById("year_level").value.trim(),
        department: document.getElementById("department").value.trim(),
        lecture: parseInt(document.getElementById("lecture").value, 10) || 0,
        com_lab: parseInt(document.getElementById("com_lab").value, 10) || 0,
        laboratory: parseInt(document.getElementById("laboratory").value, 10) || 0,
        school_lecture: parseInt(document.getElementById("school_lecture").value, 10) || 0,
        clinic: parseInt(document.getElementById("clinic").value, 10) || 0,
        subject_type: document.getElementById("subject_type").value.trim(),
        subject_nstp: document.getElementById("is_nstp").checked
      };

      if (
        !subjectData.subject_code ||
        !subjectData.subject_name ||
        !subjectData.year_level ||
        !subjectData.department ||
        !subjectData.subject_type
      ) {
        alert("Please fill out all required fields.");
        return;
      }

      const totalUnits = subjectData.lecture + subjectData.com_lab + subjectData.laboratory + subjectData.school_lecture + subjectData.clinic;
      if (totalUnits === 0) {
        alert("Please enter a value greater than 0 in at least one of: Lecture, Laboratory, School Lecture, or Clinic.");
        return;
      }

      fetch("/add_subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectData)
      })
      .then(res => {
        if (!res.ok) throw new Error("Add failed");
        return res.json();
      })
      .then(() => {
        fetchSubjectsByDepartment();
        document.getElementById("subjectForm").reset();
      })
      .catch(err => {
        console.error("Add subject error:", err);
        alert("Failed to add subject.");
      });
    });
  });
