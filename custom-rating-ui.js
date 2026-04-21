(function () {
    const CATEGORY_PATTERN = /^(.+?)\s*:\s*([0-5])$/;

    function log(...args) {
        console.log('[Advanced Ratings v1.1]', ...args);
    }

    let debounceTimer;
    let observer = new MutationObserver((mutations) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const urlMatch = window.location.pathname.match(/\/scenes\/(\d+)/);
            if (urlMatch && !window.location.pathname.includes('edit')) {
                const sceneId = urlMatch[1];
                
                if (document.querySelector('#adv-rating-trigger')) return;

                // Attempt to find the rating element or a good fallback
                let targetElement = null;
                
                // 1. Try fuzzy matching for "Rating" in class names
                const ratingElements = document.querySelectorAll('[class*="Rating_rating"], [class*="Rating-rating"], .rating-stars, .Rating, .scene-rating, .rating-container');
                if (ratingElements.length > 0) {
                    targetElement = ratingElements[0];
                }

                // 2. Fallback: Find any star icons and take their parent
                if (!targetElement) {
                    const stars = document.querySelectorAll('svg[data-icon="star"], svg[data-icon="star-half-alt"]');
                    if (stars.length > 0) {
                        targetElement = stars[0].closest('div') || stars[0].parentElement;
                    }
                }

                // 3. Fallback: Find the scene title/header area
                if (!targetElement) {
                    targetElement = document.querySelector('.scene-header h1, h1.title, [class*="SceneDetails_header"] h1');
                }

                if (targetElement) {
                    log("Attaching to element:", targetElement);
                    injectTrigger(targetElement, sceneId);
                } else {
                    log("No target found, using FAB fallback");
                    injectFAB(sceneId);
                }
            } else {
                const trigger = document.querySelector('#adv-rating-trigger');
                if (trigger) trigger.remove();
            }
        }, 500); 
    });

    observer.observe(document.body, { childList: true, subtree: true });

    async function gqlClient(query, variables) {
        const res = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables })
        });
        return res.json();
    }

    const ALL_CATEGORIES = ["Production Quality", "Chemistry", "Performance", "Aesthetics", "Creativity"];
    const DISABLE_KEYS = {
        "Production Quality": "disable_production_quality",
        "Chemistry":          "disable_chemistry",
        "Performance":        "disable_performance",
        "Aesthetics":         "disable_aesthetics",
        "Creativity":         "disable_creativity",
    };

    async function getPluginCategories() {
        const query = `query Configuration { configuration { plugins } }`;
        const res = await gqlClient(query);
        try {
            const config = res.data.configuration.plugins.stashAppAdvancedRating || {};
            return ALL_CATEGORIES.filter(c => !config[DISABLE_KEYS[c]]);
        } catch(e) {
            log("Error loading config:", e);
        }
        return [...ALL_CATEGORIES];
    }

    async function getSceneTags(sceneId) {
        const query = `query FindScene($id: ID!) { findScene(id: $id) { id tags { id name } } }`;
        const res = await gqlClient(query, { id: sceneId });
        return res.data.findScene.tags;
    }

    async function getTagIdByName(name) {
        log(`Searching for tag ID for: "${name}"`);
        const query = `query FindTags($tag_filter: TagFilterType) {
            findTags(tag_filter: $tag_filter) { tags { id name } }
        }`;
        const res = await gqlClient(query, {
            tag_filter: { name: { value: name, modifier: "EQUALS" } }
        });
        const tags = res.data.findTags.tags;
        if (tags.length > 0) {
            log(`Found tag ID: ${tags[0].id} for "${name}"`);
            return tags[0].id;
        }
        return null;
    }
    
    async function updateSceneTag(sceneId, allSceneTags, category, newScore) {
        const oldTags = allSceneTags.filter(tag => {
            const match = tag.name.match(CATEGORY_PATTERN);
            return match && match[1].trim() === category.trim();
        });

        let newTagIds = allSceneTags.map(t => t.id).filter(id => !oldTags.find(ot => ot.id === id));
        
        if (newScore !== null) {
            const newTagName = `${category}: ${newScore}`;
            const newTagId = await getTagIdByName(newTagName);

            if (newTagId) {
                newTagIds.push(newTagId);
            } else {
                console.error(`[Advanced Ratings] Tag NOT FOUND: "${newTagName}"`);
                alert(`Tag "${newTagName}" not found!\n\nCheck that the category "${category}" exists in your plugin settings and that you have run the "Create Tags" task.`);
                return false;
            }
        }

        const mutation = `mutation SceneUpdate($input: SceneUpdateInput!) { sceneUpdate(input: $input) { id } }`;
        await gqlClient(mutation, { input: { id: sceneId, tag_ids: newTagIds } });
        return true;
    }

    function injectTrigger(targetElement, sceneId) {
        const triggerBtn = document.createElement('button');
        triggerBtn.id = 'adv-rating-trigger';
        triggerBtn.innerHTML = '<span style="color:#ffc107;">★</span>+'; 
        triggerBtn.title = "Open Advanced Ratings";
        triggerBtn.className = 'adv-rating-btn';
        
        // Append into the container so it stays next to the stars
        targetElement.appendChild(triggerBtn);

        triggerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openModal(sceneId);
        });
    }

    function injectFAB(sceneId) {
        const fab = document.createElement('button');
        fab.id = 'adv-rating-trigger';
        fab.innerHTML = '<span style="color:#ffc107;">★</span>+ Advanced Ratings';
        fab.className = 'adv-rating-fab';
        document.body.appendChild(fab);

        fab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openModal(sceneId);
        });
    }

    async function openModal(sceneId) {
        if (document.querySelector('#adv-rating-modal')) return;

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'adv-rating-modal';
        modalOverlay.className = 'adv-rating-modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'adv-rating-modal-content';
        modalContent.innerHTML = `
            <div class="adv-rating-header">
                <h3>Advanced Ratings</h3>
                <span class="adv-rating-close">&times;</span>
            </div>
            <div class="ratings-list">Loading...</div>
        `;
        
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        const closeBtn = modalContent.querySelector('.adv-rating-close');

        const handleClose = () => {
            log("Closing modal and reloading page...");
            modalOverlay.remove();
            window.location.reload();
        };

        closeBtn.addEventListener('click', handleClose);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) handleClose();
        });

        const categories = await getPluginCategories();
        let sceneTags = await getSceneTags(sceneId);

        function render() {
            const listContainer = modalContent.querySelector('.ratings-list');
            listContainer.innerHTML = '';

            const currentScores = {};
            sceneTags.forEach(tag => {
                const match = tag.name.match(CATEGORY_PATTERN);
                if (match) {
                    currentScores[match[1].trim()] = parseInt(match[2], 10);
                }
            });

            const categoryDescriptions = {
                "Production Quality": "Evaluates technical execution: video resolution (4K/8K), lighting illuminating bodies and genital details, camera angles/movement capturing penetration, oral, and close-ups, audio clarity of moans, breathing, and dialogue, smooth editing, and overall polish.",
                "Chemistry": "Measures visible attraction and interaction: focuses on eye contact, authentic kissing, responsive touching, and the sense that performers are genuinely engaged during oral, penetration, and foreplay.",
                "Performance": "Assesses performers’ energy and engagement: intensity and realism of moans and expressions, stamina during extended penetration, visible physical reactions (muscle contractions, wetness, erection quality), and commitment to sexual acts.",
                "Aesthetics": "Covers physical attractiveness (body shape, grooming of genitals/pubic areas), visual presentation of breasts, buttocks, penises, and vulvas, variety of positions, and framing of penetration and bodily fluids.",
                "Creativity": "This evaluates how fresh, creative, and unique the scene feels: originality of the concept or storyline, variety and combination of sexual acts and kinks, innovative use of positions, toys, locations, or camera work, pacing and progression of the sexual sequence, and creative buildup or transitions between acts. It also assesses the raw physical intensity of the scene and its overall memorability, rewatch value, and erotic impact."
            };

            categories.forEach(cat => {
                const row = document.createElement('div');
                row.className = 'rating-row';
                
                const label = document.createElement('span');
                label.className = 'rating-label';
                
                const labelText = document.createElement('span');
                labelText.innerText = cat;
                label.appendChild(labelText);
                
                const desc = categoryDescriptions[cat];
                if (desc) {
                    const infoIcon = document.createElement('span');
                    infoIcon.className = 'rating-info-icon';
                    infoIcon.innerHTML = '&#9432;';
                    
                    const tooltip = document.createElement('div');
                    tooltip.className = 'rating-tooltip';
                    tooltip.innerText = desc;
                    infoIcon.appendChild(tooltip);
                    
                    label.appendChild(infoIcon);
                }
                
                const starsDiv = document.createElement('div');
                starsDiv.className = 'rating-stars-modal';

                const score = currentScores[cat.trim()] !== undefined ? currentScores[cat.trim()] : null;

                for (let i = 1; i <= 5; i++) {
                    const star = document.createElement('span');
                    star.className = 'rating-star';
                    star.innerHTML = (score !== null && i <= score) ? '★' : '☆';
                    star.dataset.value = i;

                    star.addEventListener('click', async () => {
                        listContainer.style.opacity = '0.5';
                        const success = await updateSceneTag(sceneId, sceneTags, cat, i);
                        if (success) {
                            sceneTags = await getSceneTags(sceneId);
                            render();
                        }
                        listContainer.style.opacity = '1';
                    });

                    star.addEventListener('mouseenter', () => {
                        const allStars = starsDiv.querySelectorAll('.rating-star');
                        allStars.forEach((s, idx) => {
                            if (idx < i) { s.classList.add('hovered'); } else { s.classList.remove('hovered'); }
                        });
                    });

                    star.addEventListener('mouseleave', () => {
                        starsDiv.querySelectorAll('.rating-star').forEach(s => s.classList.remove('hovered'));
                    });

                    starsDiv.appendChild(star);
                }

                const clearBtn = document.createElement('span');
                clearBtn.className = 'rating-clear';
                clearBtn.innerHTML = '×';
                clearBtn.title = 'Remove Category Rating';
                clearBtn.addEventListener('click', async () => {
                    listContainer.style.opacity = '0.5';
                    const success = await updateSceneTag(sceneId, sceneTags, cat, null); 
                    if(success) {
                        sceneTags = await getSceneTags(sceneId);
                        render();
                    }
                    listContainer.style.opacity = '1';
                });

                starsDiv.appendChild(clearBtn);

                row.appendChild(label);
                row.appendChild(starsDiv);
                listContainer.appendChild(row);
            });
        }

        render();
    }
})();