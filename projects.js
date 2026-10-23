(() => {
    'use strict';

    const $ = (selector) => document.querySelector(selector);
    const dialog = $('#project-dialog');
    const discardDialog = $('#discard-dialog');
    const form = $('#project-form');
    const nameInput = $('#project-name');
    const storageKey = 'gptest.projects.v1';
    const templates = { website: 'Site vitrine', application: 'Application web', documentation: 'Documentation' };
    const teams = { solo: 'Moi uniquement', small: '2 à 5 personnes', large: '6 personnes ou plus' };
    const titles = ['Choisir un modèle', 'Les détails de votre projet', 'Tout est prêt ?'];
    const descriptions = ['Un point de départ adapté à votre prochain projet.', 'Donnez un nom au projet et préparez votre équipe.', 'Vérifiez vos choix avant de créer le projet.'];
    let step = 1;
    let dirty = false;
    let completed = false;
    let projects = [];

    function textElement(tag, text, className) {
        const element = document.createElement(tag);
        element.textContent = text;
        if (className) element.className = className;
        return element;
    }

    function renderProjects() {
        const list = $('#project-list');
        list.replaceChildren();
        if (!projects.length) {
            const empty = textElement('div', '', 'empty-state');
            empty.append(textElement('h2', 'Votre prochain projet commence ici.'), textElement('p', 'Créez votre premier projet en trois étapes.'));
            list.append(empty);
            return;
        }
        const heading = textElement('h2', `Mes projets (${projects.length})`);
        const items = document.createElement('ul');
        items.className = 'project-items';
        for (const project of projects) {
            const item = document.createElement('li');
            item.append(textElement('h3', project.name), textElement('p', `${templates[project.template]} · ${teams[project.team]}`));
            item.append(textElement('small', project.checklist ? 'Checklist : définir le périmètre, préparer le contenu, vérifier le résultat.' : 'Sans checklist de démarrage.'));
            items.append(item);
        }
        list.append(heading, items);
    }

    try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(stored)) {
            projects = stored.filter((item) => item && typeof item.name === 'string' && item.name.trim().length >= 3 && item.name.length <= 60 && Object.hasOwn(templates, item.template) && Object.hasOwn(teams, item.team) && typeof item.checklist === 'boolean').slice(0, 50);
        }
    } catch {
        $('#storage-warning').hidden = false;
    }

    function values() {
        return { name: nameInput.value.trim(), template: form.elements.template.value, team: $('#team-size').value, checklist: $('#project-checklist').checked };
    }

    function renderSummary() {
        const project = values();
        const summary = $('#project-summary');
        summary.replaceChildren();
        for (const [label, value] of [['Nom du projet', project.name], ['Modèle', templates[project.template]], ['Équipe', teams[project.team]], ['Checklist de démarrage', project.checklist ? 'Incluse' : 'Non incluse']]) {
            summary.append(textElement('dt', label), textElement('dd', value));
        }
    }

    function showStep(nextStep) {
        step = nextStep;
        document.querySelectorAll('[data-step]').forEach((section) => { section.hidden = Number(section.dataset.step) !== step; });
        document.querySelectorAll('[data-step-label]').forEach((label) => {
            if (Number(label.dataset.stepLabel) === step) label.setAttribute('aria-current', 'step');
            else label.removeAttribute('aria-current');
        });
        $('#project-title').textContent = titles[step - 1];
        $('#project-description').textContent = descriptions[step - 1];
        $('#project-back').hidden = step === 1;
        $('#project-next').textContent = step === 3 ? 'Créer le projet' : 'Continuer';
        if (step === 3) renderSummary();
        dialog.scrollTop = 0;
        if (dialog.open) {
            if (step === 1) $('input[name="template"]:checked').focus();
            else if (step === 2) nameInput.focus();
            else $('#project-next').focus();
        }
    }

    function closeProject() {
        if (discardDialog.open) discardDialog.close();
        dialog.close();
        $('#open-project').focus();
    }

    function requestClose() {
        if (completed || !dirty) closeProject();
        else if (!discardDialog.open) discardDialog.showModal();
    }

    $('#open-project').addEventListener('click', () => {
        form.reset();
        dirty = false;
        completed = false;
        nameInput.removeAttribute('aria-invalid');
        $('#name-error').hidden = true;
        $('#project-success').hidden = true;
        $('.steps').hidden = false;
        $('#project-next').hidden = false;
        $('#project-cancel').hidden = false;
        $('#project-done').hidden = true;
        showStep(1);
        dialog.showModal();
        $('input[name="template"]:checked').focus();
    });
    form.addEventListener('input', () => { dirty = true; });
    form.addEventListener('change', () => { dirty = true; });
    nameInput.addEventListener('input', () => {
        if (nameInput.value.trim().length >= 3) {
            nameInput.removeAttribute('aria-invalid');
            $('#name-error').hidden = true;
        }
    });
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (completed) return;
        if (step === 1) { showStep(2); return; }
        const project = values();
        if (project.name.length < 3 || project.name.length > 60) {
            showStep(2);
            nameInput.setAttribute('aria-invalid', 'true');
            $('#name-error').hidden = false;
            nameInput.focus();
            return;
        }
        if (step === 2) { showStep(3); return; }
        completed = true;
        projects = [project, ...projects].slice(0, 50);
        try { localStorage.setItem(storageKey, JSON.stringify(projects)); }
        catch { $('#storage-warning').hidden = false; }
        renderProjects();
        document.querySelectorAll('[data-step]').forEach((section) => { section.hidden = true; });
        $('.steps').hidden = true;
        $('#project-back').hidden = true;
        $('#project-next').hidden = true;
        $('#project-cancel').hidden = true;
        $('#project-done').hidden = false;
        $('#project-success').hidden = false;
        $('#project-title').textContent = 'Projet créé';
        $('#project-description').textContent = 'La configuration est terminée.';
        $('#success-description').textContent = `${project.name} utilise le modèle ${templates[project.template]}.`;
        $('#project-done').focus();
    });
    $('#project-back').addEventListener('click', () => showStep(Math.max(1, step - 1)));
    $('#close-project').addEventListener('click', requestClose);
    $('#project-cancel').addEventListener('click', requestClose);
    $('#project-done').addEventListener('click', closeProject);
    $('#keep-editing').addEventListener('click', () => discardDialog.close());
    $('#discard-project').addEventListener('click', closeProject);
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); requestClose(); });
    dialog.addEventListener('click', (event) => {
        const bounds = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) requestClose();
    });
    renderProjects();
})();
