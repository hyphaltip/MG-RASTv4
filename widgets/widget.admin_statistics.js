(function () {
    widget = Retina.Widget.extend({
        about: {
            title: "Administrator Statistics Widget",
            name: "admin_statistics",
            author: "Tobias Paczian",
            requires: [ "rgbcolor.js" ]
        }
    });
    
    widget.setup = function () {
	return [ Retina.load_renderer("graph") ];
    };
    
    widget.display = function (wparams) {
        var widget = Retina.WidgetInstances.admin_statistics[1];

	if (wparams && wparams.main) {
	    widget.main = wparams.main;
	    widget.sidebar = wparams.sidebar;
	}

	widget.sidebar.parentNode.style.display = "none";
	widget.main.className = "span10 offset1";

	if (widget.user) {

            var html = '<h3>Job Statistics for the last 30 days</h3><div><div id="gauge_day" style="float: left; margin-left: 100px;"></div><div id="gauge_week" style="float: left; margin-left: 100px;"></div><div id="gauge_month" style="float: left; margin-left: 100px;"></div><div style="clear: both; padding-left: 240px;  margin-bottom: 50px;" id="gauge_title"></div></div><div id="statistics" style="clear: both;"><img src="Retina/images/waiting.gif" style="margin-left: 40%;"></div>';

	    // set the main content html
	    widget.main.innerHTML = html;

	    widget.getJobData();

	} else {
	    widget.sidebar.style.display = "none";
	    widget.main.innerHTML = "<h3>Authentication required</h3><p>You must be logged in to view this page.</p>";
	}
    };

    /*
      STATISTICS
     */
    widget.showJobData = function () {
	var widget = Retina.WidgetInstances.admin_statistics[1];

	// the target div
	var target = document.getElementById('statistics');

	// the job template
	var template = stm.DataStore.jobtemplate[1];

	// get the names for the task ids and initialize the task counter
	var tasklabels = [];
	var tasknames = {};
	var taskcount = {};
	for (var i=0; i<template.tasks.length; i++) {
	    tasklabels[i] = template.tasks[i].cmd.description;
	    tasknames[i] = template.tasks[i].cmd.description;
	    taskcount[i] = [ 0, 0, 0, 0 ];
	}
	tasknames["-1"] = "done";
	tasklabels.push("done");

	// all jobs submitted within the last 30 days (initially only the inactive ones)
	var jobs30 = [];
	var jk = Retina.keys(stm.DataStore.inactivejobs);
	for (var i=0;i<jk.length;i++) {
	    jobs30.push(stm.DataStore.inactivejobs[jk[i]]);
	}

	// jobs currently active in the pipeline
	var jobsactive = [];
	jk = Retina.keys(stm.DataStore.activejobs);
	for (var i=0;i<jk.length;i++) {
	    jobsactive.push(stm.DataStore.activejobs[jk[i]]);
	}

	// timestamp of 30 days ago
	var month = widget.dateString(1000 * 60 * 60 * 24 * 30);
	var week = widget.dateString(1000 * 60 * 60 * 24 * 7);
	var day = widget.dateString(1000 * 60 * 60 * 24);
	
	// chicago day
	var chicagoTime = new Date( new Date().getTime() - (1000 * 60 * 60 * 6) ); // UTC-6
	var chicagoDayStart = chicagoTime.getUTCMilliseconds() + (1000 * chicagoTime.getUTCSeconds()) + (1000 * 60 * chicagoTime.getUTCMinutes()) + (1000 * 60 * 60 * chicagoTime.getUTCHours());
	chicagoDayStart =  widget.dateString(chicagoDayStart);

	// initialize state counter
	var states = { "in-progress": 0,
		       "pending": 0,
		       "queued": 0,
		       "suspend": 0,
		       "unknown": 0 };

	var size_in_pipeline = 0;

	// iterate over the active jobs
	for (var i=0; i<jobsactive.length; i++) {

	    // count the total size in the pipeline
	    size_in_pipeline += jobsactive[i].userattr.bp_count ? parseInt(jobsactive[i].userattr.bp_count) : jobsactive[i].size;

	    // count the current state
	    states[jobsactive[i].state]++;

	    // count the current task
	    if (jobsactive[i].state == "in-progress") {
		taskcount[jobsactive[i].task][0]++;
		taskcount[jobsactive[i].task][2] += jobsactive[i].userattr.bp_count ? parseInt(jobsactive[i].userattr.bp_count) : jobsactive[i].size;
	    } else {
		if (! taskcount.hasOwnProperty(jobsactive[i].task)) {
		    taskcount[jobsactive[i].task] = [ 0, 0, 0, 0 ];
		}
		taskcount[jobsactive[i].task][1]++;
		taskcount[jobsactive[i].task][3] += jobsactive[i].userattr.bp_count ? parseInt(jobsactive[i].userattr.bp_count) : jobsactive[i].size;
	    }

	    // get the active jobs for last 30 days
	    if (jobsactive[i].submittime >= month) {
		jobs30.push(jobsactive[i]);
	    }
	}

	// add chicago timestamps
	var chicago = 1000 * 60 * 60 * 6;
	var now = new Date().getTime();
	for (var i=0; i<jobs30.length; i++) {
	    jobs30[i].submitChicago = widget.dateString(now - (Date.parse(jobs30[i].submittime) - chicago));
	    jobs30[i].completeChicago = widget.dateString(now - (Date.parse(jobs30[i].completedtime) - chicago));
	}

	var num_in_pipeline = jobsactive.length;

	// initialize vars
	var submitted_today = 0;
	var num_submitted_today = 0;
	var completed_today = 0;
	var num_completed_today = 0;
	var submitted_week = 0;
	var num_submitted_week = 0;
	var completed_week = 0;
	var num_completed_week = 0;
	var submitted_month = 0;
	var num_submitted_month = 0;
	var completed_month = 0;
	var num_completed_month = 0;

	var completed_jobs = {};
	var submitted_jobs = {};
	var completed_bases = {};
	var submitted_bases = {};
	
	var completed_chicago_day = 0;

	// iterate over all jobs of the last month
	for (var i=0; i<jobs30.length; i++) {
	    var submitted_day = jobs30[i].submitChicago.substr(0,10);
	    var completed_day = jobs30[i].completeChicago.substr(0,10);
	    if (! submitted_jobs.hasOwnProperty(submitted_day)) {
		submitted_jobs[submitted_day] = 0;
		submitted_bases[submitted_day] = 0;
	    }
	    submitted_jobs[submitted_day]++;
	    submitted_bases[submitted_day] += jobs30[i].userattr.bp_count ? parseInt(jobs30[i].userattr.bp_count) : jobs30[i].size;
	    if (! completed_jobs.hasOwnProperty(completed_day)) {
		completed_jobs[completed_day] = 0;
		completed_bases[completed_day] = 0;
	    }
	    completed_jobs[completed_day]++;
	    completed_bases[completed_day] += jobs30[i].userattr.bp_count ? parseInt(jobs30[i].userattr.bp_count) : jobs30[i].size;

	    if (jobs30[i].submittime >= month) {
		num_submitted_month++;
		submitted_month += jobs30[i].userattr.bp_count ? parseInt(jobs30[i].userattr.bp_count) : jobs30[i].size;
	    }
	    if (jobs30[i].submittime >= week) {
		num_submitted_week++;
		submitted_week += jobs30[i].userattr.bp_count ? parseInt(jobs30[i].userattr.bp_count) : jobs30[i].size;
	    }
	    if (jobs30[i].submittime >= day) {
		num_submitted_today++;
		submitted_today += jobs30[i].userattr.bp_count ? parseInt(jobs30[i].userattr.bp_count) : jobs30[i].size;
	    }
	    if (jobs30[i].completedtime >= month) {
		num_completed_month++;
		completed_month += jobs30[i].userattr.bp_count ? parseInt(jobs30[i].userattr.bp_count) : jobs30[i].size;
	    }
	    if (jobs30[i].completedtime >= week) {
		num_completed_week++;
		completed_week += jobs30[i].userattr.bp_count ? parseInt(jobs30[i].userattr.bp_count) : jobs30[i].size;
	    }
	    if (jobs30[i].completedtime >= day) {
		num_completed_today++;
		completed_today += jobs30[i].userattr.bp_count ? parseInt(jobs30[i].userattr.bp_count) : jobs30[i].size;
	    }
	    if (jobs30[i].completedtime >= chicagoDayStart) {
		completed_chicago_day += jobs30[i].userattr.bp_count ? parseInt(jobs30[i].userattr.bp_count) : jobs30[i].size;
	    }
	}
	var submitted_week_per_day = submitted_week / 7;
	var num_submitted_week_per_day = parseInt(num_submitted_week / 7);
	var completed_week_per_day = completed_week / 7;
	var num_completed_week_per_day = parseInt(num_completed_week / 7);
	var submitted_month_per_day = submitted_month / 30;
	var num_submitted_month_per_day = parseInt(num_submitted_month / 30);
	var completed_month_per_day = completed_month / 30;
	var num_completed_month_per_day = parseInt(num_completed_month / 30);
	
	var html = '<div><b>Data completed today (since 00:00AM Chicago time)</b><div class="progress"><div class="bar" style="width: '+(completed_chicago_day / 2000000000)+'%;"></div></div></div><div style="position: relative; bottom: 40px; color: lightgray; left: 20px;">'+(completed_chicago_day / 1000000000).formatString(3)+' Gbp</div>';
	html += '<table class="table">';
	html += "<tr><td><b>data currently in the pipeline</b></td><td>"+size_in_pipeline.baseSize()+" in "+num_in_pipeline+" jobs</td></tr>";
	html += "<tr><td><b>submitted last 24h</b></td><td>"+submitted_today.baseSize()+" in "+num_submitted_today+" jobs</td></tr>";
	html += "<tr><td><b>completed last 24h</b></td><td>"+completed_today.baseSize()+" in "+num_completed_today+" jobs</td></tr>";
	html += "<tr><td><b>submitted last 7 days</b></td><td>"+submitted_week.baseSize()+" (avg. "+submitted_week_per_day.baseSize()+" per day) in "+num_submitted_week+" jobs (avg. "+num_submitted_week_per_day+" per day)</td></tr>";
	html += "<tr><td><b>completed last 7 days</b></td><td>"+completed_week.baseSize()+" (avg. "+completed_week_per_day.baseSize()+" per day) in "+num_completed_week+" jobs (avg. "+num_completed_week_per_day+" per day)</td></tr>";
	html += "<tr><td><b>submitted last 30 days</b></td><td>"+submitted_month.baseSize()+" (avg. "+submitted_month_per_day.baseSize()+" per day) in "+num_submitted_month+" jobs (avg. "+num_submitted_month_per_day+" per day)</td></tr>";
	html += "<tr><td><b>completed last 30 days</b></td><td>"+completed_month.baseSize()+" (avg. "+completed_month_per_day.baseSize()+" per day) in "+num_completed_month+" jobs (avg. "+num_completed_month_per_day+" per day)</td></tr>";

	html += "</table><h4>currently running stages</h4><div id='task_graph_running'></div><h4>currently pending stages</h4><div id='task_graph_pending'></div><h4>currently running data in stages in GB</h4><div id='task_graph_running_GB'></div><h4>currently pending data in stages in GB</h4><div id='task_graph_pending_GB'></div><h4>number of <span style='color: blue;'>submitted</span> and <span style='color: red;'>completed</span> jobs</h4><div id='day_graph'></div><h4><span style='color: blue;'>submitted</span> and <span style='color: red;'>completed</span> GB</h4><div id='dayc_graph'></div><h4>current job states</h4><div id='state_graph'></div>";

	target.innerHTML = html;

	// gauges
	var gauges = ['day','week','month'];
	for (var i=0; i<gauges.length; i++) {
	    var val = parseInt(((i == 1) ? completed_week_per_day : (i == 2 ? completed_month_per_day : completed_today)) / 1000000000);
	    var tick =  parseInt(((i == 1) ? submitted_week_per_day : (i == 2 ? submitted_month_per_day : submitted_today)) / 1000000000);
	    var gauge_data = google.visualization.arrayToDataTable([ ['Label', 'Value'], [gauges[i] == 'day' ? "24h" : gauges[i], val] ]);
	    var mt = ["0",20,40,60,80,100,120,140,160,180,200];
	    if (val > 200 || tick > 200) {
		mt = [];
		var v = (val > tick) ? val : tick;
		var t = parseInt(v / 10);
		for (var h=0; h<10; h++) {
		    mt.push((h * t)+"");
		}
		mt.push(v);
	    }
            var gauge_options = {
		width: 325, height: 200,
		redFrom: tick - 2, redTo: tick,
		majorTicks: mt,
		minorTicks: 0,
		min: 0,
		max: val > tick ? (val > 200 ? val : 200) : (tick > 200 ? tick : 200)
            };

            var chart = new google.visualization.Gauge(document.getElementById('gauge_'+gauges[i]));
            chart.draw(gauge_data, gauge_options);
	}
	document.getElementById('gauge_title').innerHTML = "average Gigabasepair throughput per 24h period (red mark shows submission)";

	// state graph
	var sdata = [ { name: "count", data: [] } ];
	var slabels = [];
	for (var i in states) {
	    if (states.hasOwnProperty(i)) {
		sdata[0].data.push(states[i]);
		slabels.push(i+" ("+states[i]+")");
	    }
	}
	Retina.Renderer.create("graph", { target: document.getElementById('state_graph'),
					  x_labels: slabels,
					  chartArea: [0.1, 0.1, 0.95, 0.7],
					  x_labels_rotation: "-25",
					  data: sdata }).render();
	
	// task graph s
	var tdatar = [ { name: "running", data: [] } ];
	for (var i=0; i<template.tasks.length; i++) {
	    tdatar[0].data.push(taskcount[i][0]);
	}
	Retina.Renderer.create("graph", { target: document.getElementById('task_graph_running'),
					  data: tdatar,
					  x_labels: tasklabels,
					  chartArea: [0.1, 0.1, 0.95, 0.7],
					  x_labels_rotation: "-25",
					  type: "column" }).render();

	var tdatap = [ { name: "pending", data: [] } ];
	for (var i=0; i<template.tasks.length; i++) {
	    tdatap[0].data.push(taskcount[i][1]);
	}
	Retina.Renderer.create("graph", { target: document.getElementById('task_graph_pending'),
					  data: tdatap,
					  x_labels: tasklabels,
					  chartArea: [0.1, 0.1, 0.95, 0.7],
					  x_labels_rotation: "-25",
					  type: "column" }).render();


	// task GB graph s
	var tdatars = [ { name: "running", data: [] } ];
	for (var i=0; i<template.tasks.length; i++) {
	    tdatars[0].data.push(parseInt(taskcount[i][2] / 1000000000));
	}
	Retina.Renderer.create("graph", { target: document.getElementById('task_graph_running_GB'),
					  data: tdatars,
					  x_labels: tasklabels,
					  chartArea: [0.1, 0.1, 0.95, 0.7],
					  x_labels_rotation: "-25",
					  type: "column" }).render();

	var tdataps = [ { name: "running", data: [] } ];
	for (var i=0; i<template.tasks.length; i++) {
	    tdataps[0].data.push(parseInt(taskcount[i][3] / 1000000000));
	}
	Retina.Renderer.create("graph", { target: document.getElementById('task_graph_pending_GB'),
					  data: tdataps,
					  x_labels: tasklabels,
					  chartArea: [0.1, 0.1, 0.95, 0.7],
					  x_labels_rotation: "-25",
					  type: "column" }).render();


	// daygraph
	var days = [];
	var one_day = 1000 * 60 * 60 * 24;
	for (var i=0; i<30; i++) {
	    days.push(widget.dateString((29 - i) * one_day).substr(0,10));
	}
	var daydata = [ { name: "#submitted", data: [] },
			{ name: "#completed", data: [] } ];
	var daycdata = [ { name: "submitted (GB)", data: [] },
			 { name: "completed (GB)", data: [] } ];
	var avgsizedata = [ { name: "average jobsize submitted", data: [] },
			    { name: "average jobsize completed", data: [] } ];
	for (var i=0; i<days.length; i++) {
	    daydata[0].data.push(submitted_jobs.hasOwnProperty(days[i]) ? submitted_jobs[days[i]] : 0)
	    daydata[1].data.push(completed_jobs.hasOwnProperty(days[i]) ? completed_jobs[days[i]] : 0);
	    daycdata[0].data.push(submitted_bases.hasOwnProperty(days[i]) ? parseInt(submitted_bases[days[i]] / 1000000000) : 0);
	    daycdata[1].data.push(completed_bases.hasOwnProperty(days[i]) ? parseInt(completed_bases[days[i]] / 1000000000) : 0);
	}
	Retina.Renderer.create("graph", { target: document.getElementById('day_graph'),
					  data: daydata,
					  x_labels: days,
					  width: 950,
					  chartArea: [0.05, 0.1, 0.95, 0.7],
					  x_labels_rotation: "-35",
					  type: "column" }).render();
	Retina.Renderer.create("graph", { target: document.getElementById('dayc_graph'),
					  data: daycdata,
					  width: 950,
					  x_labels: days,
					  chartArea: [0.05, 0.1, 0.95, 0.7],
					  x_labels_rotation: "-35",
					  type: "column" }).render();
    };

    widget.dateString = function (period) {
	var past = new Date(new Date().getTime() - period);
	var d = past.getUTCDate().padLeft();
	var m = (past.getUTCMonth() + 1).padLeft();
	var hour = past.getUTCHours().padLeft();
	var minute = past.getUTCMinutes().padLeft();
	var second = past.getUTCSeconds().padLeft();
	var ms = past.getUTCMilliseconds().padLeft(100);
	var timestamp = past.getUTCFullYear() + "-" + m + "-" + d + "T" + hour +":" + minute + ":" + second + "." + ms + "Z";
	return timestamp;
    };

    widget.getJobData = function () {
	var widget = Retina.WidgetInstances.admin_statistics[1];
	
	var timestamp = widget.dateString(1000 * 60 * 60 * 24 * 30);
	if (stm.DataStore.hasOwnProperty('updateTime') && stm.DataStore.updateTime[1]) {
	     timestamp = widget.dateString(new Date().getTime() - stm.DataStore.updateTime[1].update_time);
	}
	var utime = new Date().getTime();
	var promises = [];
	var prom = jQuery.Deferred();
	promises.push(prom);
	promises.push(jQuery.ajax( { dataType: "json",
				     url: RetinaConfig['mgrast_api'] + "/pipeline?date_start="+timestamp+"&verbosity=minimal&limit=10000&state=completed&state=suspend&userattr=bp_count",
				     headers: widget.authHeader,
				     success: function(data) {
					 if (! stm.DataStore.hasOwnProperty('inactivejobs')) {
					     stm.DataStore.inactivejobs = {};
					 }
					 for (var i=0; i<data.data.length; i++) {
					     stm.DataStore.inactivejobs[data.data[i].id] = data.data[i];
					 }
					 if (stm.DataStore.hasOwnProperty('jobtemplate') && stm.DataStore.jobtemplate[1]) {
					     prom.resolve();
					 } else {
					     jQuery.ajax( { dataType: "json",
					 		    url: RetinaConfig['mgrast_api'] + "/pipeline/"+data.data[0].name,
					 		    headers: widget.authHeader,
					 		    success: function(data) {
					 			stm.DataStore.jobtemplate = { 1: data.data[0] };
					 		    },
					 		    error: function () {
					 			alert('there was an error retrieving the data');
					 		    }
					 		  } ).then(function(){ prom.resolve(); });
					 }
				     },
				     error: function () {
					 alert('there was an error retrieving the data');
				     }
				   } ) );
	
	promises.push(jQuery.ajax( { dataType: "json",
				     url: RetinaConfig['mgrast_api'] + "/pipeline?state=in-progress&state=queued&state=pending&verbosity=minimal&limit=10000&userattr=bp_count",
				     headers: widget.authHeader,
				     success: function(data) {
					 stm.DataStore.activejobs = {};
					 for (var i=0; i<data.data.length; i++) {
					     stm.DataStore.activejobs[data.data[i].id] = data.data[i];
					 }
				     },
				     error: function () {
					 alert('there was an error retrieving the data');
				     }
				   } ) );
	jQuery.when.apply(this, promises).then(function() {
	    stm.DataStore.updateTime = { 1: { update_time: new Date().getTime() } };
	    stm.dump(true, 'admin_statistics');
	    Retina.WidgetInstances.admin_statistics[1].showJobData();
	});
    };


    // login callback
    widget.loginAction = function (data) {
	var widget = Retina.WidgetInstances.admin_statistics[1];
	if (data.user) {
	    widget.user = data.user;
	    widget.authHeader = { "Auth": data.token };
	} else {
	    widget.user = null;
	    widget.authHeader = {};
	}
	widget.display();
    };

})();