
function calculatePaymentPlan(professorId, planType) {
  const detailsContainer = document.getElementById(`schemeDetails-${professorId}`);
  if (!detailsContainer) {
      console.error('Details container not found');
      return;
  }

  const schemeData = JSON.parse(detailsContainer.dataset.scheme);
  const planDetails = document.getElementById(`planDetails-${professorId}`);

  if (!planDetails) {
      console.error('Plan details container not found');
      return;
  }

  // Safely parse float values with fallback to 0
  const parseSafe = (value) => parseFloat(value) || 0;

  // Calculate total fees using all components including NSTP
  const totalFees = parseSafe(schemeData.regular_fees) +
                   parseSafe(schemeData.misc_fees) +
                   parseSafe(schemeData.calculatedLabFees) +
                   parseSafe(schemeData.calculatedRLEFees) +
                   parseSafe(schemeData.aff_fee) +
                   parseSafe(schemeData.calculatedTuitionFees) +
                   parseSafe(schemeData.calculatedNSTPFees); // Include NSTP fees

  let planHTML = '';

  switch(planType) {
      case 'cash':
          const cashPayment = totalFees * 0.95; // 5% discount
          planHTML = `
              <div class="font-medium">Cash Payment (5% Discount)</div>
              <div class="mt-2">
                  <span class="text-gray-500">Total Fees:</span>
                  <span class="font-medium">₱${totalFees.toFixed(2)}</span>
              </div>
              <div>
                  <span class="text-gray-500">Discount (5%):</span>
                  <span class="font-medium">₱${(totalFees * 0.05).toFixed(2)}</span>
              </div>
              <div class="mt-2">
                  <span class="text-green-600 font-bold">Amount to Pay:</span>
                  <span class="font-bold">₱${cashPayment.toFixed(2)}</span>
              </div>
          `;
          break;

      case 'planA':
          const downPaymentA = 500;
          const remainingA = totalFees - downPaymentA;
          planHTML = `
              <div class="font-medium">Plan A Payment</div>
              <div class="mt-2">
                  <span class="text-gray-500">Total Fees:</span>
                  <span class="font-medium">₱${totalFees.toFixed(2)}</span>
              </div>
              <div>
                  <span class="text-gray-500">Down Payment:</span>
                  <span class="font-medium">₱${downPaymentA.toFixed(2)}</span>
              </div>
              <div>
                  <span class="text-gray-500">Remaining Balance:</span>
                  <span class="font-medium">₱${remainingA.toFixed(2)}</span>
              </div>
          `;
          break;

      case 'planB':
          const downPaymentB = parseSafe(schemeData.misc_fees) + parseSafe(schemeData.regular_fees);
          const remainingB = totalFees - downPaymentB;
          const monthlyPayment = remainingB / 4;
          planHTML = `
              <div class="font-medium">Plan B Payment (4 Months)</div>
              <div class="mt-2">
                  <span class="text-gray-500">Total Fees:</span>
                  <span class="font-medium">₱${totalFees.toFixed(2)}</span>
              </div>
              <div>
                  <span class="text-gray-500">Down Payment (Misc + Reg):</span>
                  <span class="font-medium">₱${downPaymentB.toFixed(2)}</span>
              </div>
              <div>
                  <span class="text-gray-500">Remaining Balance:</span>
                  <span class="font-medium">₱${remainingB.toFixed(2)}</span>
              </div>
              <div class="mt-2">
                  <span class="text-gray-500">Monthly Payment (4 months):</span>
                  <span class="font-medium">₱${monthlyPayment.toFixed(2)}</span>
              </div>
          `;
          break;

      default:
          planHTML = '<div class="text-red-500">Invalid payment plan selected</div>';
  }

  planDetails.innerHTML = planHTML;
}

async function assignPaymentToProfessor(professorId) {
    const schemeSelect = document.getElementById(`paymentScheme-${professorId}`);
    const planSelect = document.getElementById(`paymentPlan-${professorId}`);
    const selectedSchemeId = schemeSelect.value;
    const selectedPlan = planSelect ? planSelect.value : null;

    if (!selectedSchemeId) {
        showNotification('error', 'Please select a payment scheme');
        return;
    }

    if (!selectedPlan) {
        showNotification('error', 'Please select a payment plan');
        return;
    }

    try {
        // Get the selected scheme details from the dropdown
        const selectedOption = schemeSelect.options[schemeSelect.selectedIndex];
        const scheme = JSON.parse(selectedOption.dataset.scheme);

        // Get the professor's subjects
        const professor = professorsPending[professorId];

        // Calculate units and fees (same as in loadAssignedPaymentDetails)
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

            totalComLabUnits += parseFloat(subject.com_lab) || 0;
            totalLaboratoryUnits += parseFloat(subject.laboratory) || 0;
            totalLabUnits = totalComLabUnits + totalLaboratoryUnits;

            totalSchoolLectureUnits += parseFloat(subject.school_lecture) || 0;
            totalClinicUnits += parseFloat(subject.clinic) || 0;
            totalRLEUnits = totalSchoolLectureUnits + totalClinicUnits;
        });

        // Calculate the fees (same as in loadAssignedPaymentDetails)
        const totalLabFees = (totalComLabUnits * parseFloat(scheme.com_lab_fee || 0)) +
                            (totalLaboratoryUnits * parseFloat(scheme.laboratory_fee || 0));

        const totalRLEFees = (totalSchoolLectureUnits * parseFloat(scheme.school_lecture_fee || 0)) +
                            (totalClinicUnits * parseFloat(scheme.clinic_fee || 0));

        const totalPerTuitionFees = totalPerUnit * parseFloat(scheme.tuition_fee);
        const totalNSTPFees = totalNSTPUnits * parseFloat(scheme.unit_fee || 0);

        // Calculate total fees (same as in loadAssignedPaymentDetails)
        const totalFees = parseFloat(scheme.regular_fees || 0) +
                         parseFloat(scheme.misc_fees || 0) +
                         totalLabFees +
                         totalRLEFees +
                         parseFloat(scheme.aff_fee || 0) +
                         totalPerTuitionFees +
                         totalNSTPFees;

        // Prepare the subjects data - just the subject codes
        const subjectsData = professor.subjects.map(sub => sub.subject_code);

        const response = await fetch('/assign_payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                professor_id: professorId,
                scheme_id: selectedSchemeId,
                payment_plan: selectedPlan,
                subjects: subjectsData,
                // Include calculated values for verification
                total_lab_units: totalLabUnits,
                total_rle_units: totalRLEUnits,
                total_per_units: totalPerUnit,
                total_nstp_units: totalNSTPUnits,
                total_lab_fees: totalLabFees,
                total_rle_fees: totalRLEFees,
                total_tuition_fees: totalPerTuitionFees,
                total_nstp_fees: totalNSTPFees,
                total_fees: totalFees
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to assign payment scheme');
        }

        // Mark professor as assigned
        assignedProfessors.add(professorId);
        localStorage.setItem('assignedProfessors', JSON.stringify(Array.from(assignedProfessors)));

        // Close modal and refresh tables
        const modal = document.getElementById(`professorModal-${professorId}`);
        if (modal) modal.remove();

        loadSubjects();
        loadApprovedSubjects();

        showNotification('success', 'Payment scheme assigned successfully');

    } catch (error) {
        console.error('Error assigning payment:', error);
        showNotification('error', error.message || 'Failed to assign payment scheme');
    }
}

function showNotification(type, message) {
const notification = document.createElement('div');
notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg ${
  type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
}`;
notification.textContent = message;
document.body.appendChild(notification);

setTimeout(() => {
  notification.remove();
  }, 5000);
}
