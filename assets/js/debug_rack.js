
// Force Listener Attachment immediately
(function() {
    console.log("CRITICAL DEBUG: Bootstrapper running");
    
    // Unlock Delegation
    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'btn-unlock-details' || e.target.closest('#btn-unlock-details')) {
            alert('DEBUG: Unlock Clicked (Bootstrapper)');
            // Try to find the function in global scope? No, modules are scoped.
            // But we can manually toggle the fieldset to prove it works
            const fs = document.getElementById('room-details-fieldset');
            if (fs) {
                fs.disabled = false;
                alert('DEBUG: Fieldset enabled manually');
            } else {
                alert('DEBUG: Fieldset NOT detected');
            }
        }
    });

    // Alarm Bell Delegation
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('#btnSystemAlarms')) {
             alert('DEBUG: Bell Clicked (Bootstrapper)');
        }
    });
})();
