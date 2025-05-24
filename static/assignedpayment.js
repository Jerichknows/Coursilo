
async function loadAssignedPaymentDetails(professorId) {
    try {
        const response = await fetch(`/get_assigned_payments?professor_id=${professorId}`);

        // First check if the response is ok (status 200-299)
        if (!response.ok) {
            // If we get a 404, handle it specifically
            if (response.status === 404) {
                throw new Error('No payment assignments found for this professor');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const paymentAssignments = await response.json();

        const detailsContainer = document.getElementById(`assignedPaymentDetails-${professorId}`);
        if (!detailsContainer) {
            console.error(`Container not found for professor ${professorId}`);
            return;
        }

        // Clear previous content
        detailsContainer.innerHTML = '';

        // Handle error response (from the JSON)
        if (paymentAssignments.error) {
            detailsContainer.innerHTML = `
                <div class="col-span-2 text-center py-4 text-red-500">
                    ${paymentAssignments.error}
                </div>
            `;
            return;
        }


        // Ensure we have an array (even if empty)
        const assignments = Array.isArray(paymentAssignments) ? paymentAssignments : [paymentAssignments];

        if (assignments.length === 0) {
            detailsContainer.innerHTML = `
                <div class="col-span-2 text-center py-4 text-gray-500">
                    No payment details found for this professor.
                </div>
            `;
            return;
        }

        // Process each payment assignment
        let allDetailsHTML = '';
        assignments.forEach((assignment, index) => {
            const scheme = assignment.scheme;
            const plan = assignment.plan;
            const subjects = assignment.subjects || [];

            if (!scheme) {
                allDetailsHTML += `
                    <div class="col-span-2 mb-6 p-4 border rounded-lg bg-gray-50">
                        <h4 class="text-lg font-semibold text-gray-800 border-b pb-2">
                            Payment Assignment ${index + 1} (No Scheme)
                        </h4>
                        <div class="mt-2 text-gray-500">
                            Subjects assigned but no payment scheme selected.
                        </div>
                    </div>
                `;
                return;
            }

            // Calculate totals for this assignment
            let totalLabUnits = 0;
            let totalRLEUnits = 0;
            let totalPerUnit = 0;
            let totalNSTPUnits = 0;
            let totalComLabUnits = 0;
            let totalLaboratoryUnits = 0;
            let totalSchoolLectureUnits = 0;
            let totalClinicUnits = 0;

            subjects.forEach(subject => {
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

            // Calculate the fees for this assignment
            const totalLabFees = (totalComLabUnits * parseFloat(scheme.com_lab_fee || 0)) +
                                (totalLaboratoryUnits * parseFloat(scheme.laboratory_fee || 0));

            const totalRLEFees = (totalSchoolLectureUnits * parseFloat(scheme.school_lecture_fee || 0)) +
                                (totalClinicUnits * parseFloat(scheme.clinic_fee || 0));

            const totalPerTuitionFees = totalPerUnit * parseFloat(scheme.tuition_fee);
            const totalNSTPFees = totalNSTPUnits * parseFloat(scheme.unit_fee || 0);

            const totalFees = parseFloat(scheme.regular_fees || 0) +
                             parseFloat(scheme.misc_fees || 0) +
                             totalLabFees +
                             totalRLEFees +
                             parseFloat(scheme.aff_fee || 0) +
                             totalPerTuitionFees +
                             totalNSTPFees;

            // Generate HTML for this payment assignment
            allDetailsHTML += `
                <div class="col-span-2 mb-6 p-4 border rounded-lg bg-white">
                    <h4 class="text-lg font-semibold text-gray-800 border-b pb-2">
                        Payment Assignment ${index + 1}
                    </h4>
                    <div class="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <span class="text-gray-600 font-medium">Scheme:</span>
                            <span class="ml-2">${scheme.payment_name}</span>
                        </div>
                        <div>
                            <span class="text-gray-600 font-medium">Plan:</span>
                            <span class="ml-2">${plan}</span>
                        </div>
                    </div>

                    <div class="col-span-2 mt-4">
                        <h5 class="font-medium text-gray-700 mb-2 border-b pb-1">Assigned Subjects</h5>
                        <div class="grid grid-cols-1 gap-2">
                            ${subjects.map(subject => `
                                <div class="flex justify-between">
                                    <span>${subject.subject_code} - ${subject.subject_name}</span>
                                    <span class="text-gray-500">
                                        ${subject.lecture ? `Lec: ${subject.lecture}` : ''}
                                        ${subject.com_lab ? `ComLab: ${subject.com_lab}` : ''}
                                        ${subject.laboratory ? `Lab: ${subject.laboratory}` : ''}
                                        ${subject.school_lecture ? `SchLec: ${subject.school_lecture}` : ''}
                                        ${subject.clinic ? `Clinic: ${subject.clinic}` : ''}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="col-span-2 mt-4">
                        <h5 class="font-medium text-gray-700 mb-2 border-b pb-1">Fee Breakdown</h5>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <span class="text-gray-500">Registration Fee:</span>
                                <span class="font-medium float-right">₱${parseFloat(scheme.regular_fees || 0).toFixed(2)}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Miscellaneous Fee:</span>
                                <span class="font-medium float-right">₱${parseFloat(scheme.misc_fees || 0).toFixed(2)}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Lab Fees (${totalLabUnits} units):</span>
                                <span class="font-medium float-right">₱${totalLabFees.toFixed(2)}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">RLE Fees (${totalRLEUnits} units):</span>
                                <span class="font-medium float-right">₱${totalRLEFees.toFixed(2)}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Affiliation Fee:</span>
                                <span class="font-medium float-right">₱${parseFloat(scheme.aff_fee || 0).toFixed(2)}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Tuition Fee (${totalPerUnit} units):</span>
                                <span class="font-medium float-right">₱${totalPerTuitionFees.toFixed(2)}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">NSTP Fee (${totalNSTPUnits} units):</span>
                                <span class="font-medium float-right">₱${totalNSTPFees.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="col-span-2 border-t border-gray-200 pt-2 mt-2">
                            <span class="text-gray-700 font-semibold">Total Fees:</span>
                            <span class="font-bold text-lg float-right">₱${totalFees.toFixed(2)}</span>
                        </div>

                        ${plan === 'cash' ? `
                            <div class="col-span-2 mt-4 bg-green-50 p-3 rounded-md">
                                <h5 class="text-center font-medium text-green-700 mb-1">Cash Payment Details</h5>
                                <div class="grid grid-cols-3 gap-3">
                                    <div>
                                        <span class="text-gray-600">Total Fees:</span>
                                        <span class="float-center">₱${totalFees.toFixed(2)}</span>
                                    </div>
                                    <div></div>
                                    <div>
                                        <span class="text-right text-gray-600">Discount (5%):</span>
                                        <span class="float-center">-₱${(totalFees * 0.05).toFixed(2)}</span>
                                    </div>
                                    <div class="text-center col-span-3 border-t mt-1 pt-1">
                                        <span class=" font-medium text-green-600">Amount to Pay:</span>
                                        <span class="font-medium float-center">₱${(totalFees * 0.95).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        ${plan === 'planA' ? `
                            <div class="col-span-2 mt-4 bg-blue-50 p-3 rounded-md">
                                <h5 class="font-medium text-blue-700 mb-1">Plan A Payment Schedule</h5>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <span class="text-gray-600">Down Payment:</span>
                                        <span class="float-center">₱500.00</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-600">Remaining Balance:</span>
                                        <span class="float-center">₱${(totalFees - 500).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        ${plan === 'planB' ? `
                            <div class="col-span-2 mt-4 bg-purple-50 p-3 rounded-md">
                                <h5 class="font-medium text-purple-700 mb-1">Plan B Payment Schedule (4 Months)</h5>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <span class="text-gray-600">Down Payment (Misc + Reg):</span>
                                        <span class="float-center">₱${(parseFloat(scheme.misc_fees || 0) + parseFloat(scheme.regular_fees || 0)).toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-600">Monthly Payment (4 months):</span>
                                        <span class="float-center">₱${((totalFees - (parseFloat(scheme.misc_fees || 0) + parseFloat(scheme.regular_fees || 0))) / 4).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        detailsContainer.innerHTML = allDetailsHTML;

      } catch (error) {
          console.error(`Error loading payment details for professor ${professorId}:`, error);
          const detailsContainer = document.getElementById(`assignedPaymentDetails-${professorId}`);
          if (detailsContainer) {
              detailsContainer.innerHTML = `
                  <div class="col-span-2 text-center py-4 text-red-500">
                      ${error.message}
                  </div>
              `;
          }
      }
  }


// Load payment details for all professors
async function loadAllProfessorsPaymentDetails() {
    // Get all professor elements (adjust selector to match your HTML)
    const professorElements = document.querySelectorAll('[data-professor-id]');

    // Create an array of promises for all professor loads
    const loadPromises = Array.from(professorElements).map(element => {
        const professorId = element.getAttribute('data-professor-id');
        if (professorId) {
            return loadAssignedPaymentDetails(professorId);
        }
        return Promise.resolve();
    });

    // Wait for all loads to complete
    await Promise.all(loadPromises);

    console.log('Finished loading payment details for all professors');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadAllProfessorsPaymentDetails();

    // Optional: Add event listener for refresh button if you have one
    const refreshBtn = document.getElementById('refreshPaymentDetails');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadAllProfessorsPaymentDetails);
    }
});
