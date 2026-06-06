jQuery(document).ready(function($) {
    function loadProjects(category = 'all') {
        $.ajax({
            url: ProjectWidgetAjax.ajaxurl,
            type: 'POST',
            data: {
                action: 'filter_projects',
                category: category
            },
            success: function(response) {
                $('#projects-grid').html(response);
            }
        });
    }

    loadProjects();

    $('.project-tabs').on('click', '.tab-btn', function() {
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        const category = $(this).data('category');
        loadProjects(category);
    });
});