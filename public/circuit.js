var ResetGraph = function () {
     $.ajax({ 
        url: '/reset',
        type: 'get',
        dataType: 'json',
        cache: false,
        success: function (data) { }
     });
}

var html = "";

var selectTimespanOption = function (timespan) {
    if (timespan != null) {
        $('#Timespan option')
            .filter(function (index) { return $(this).text() === timespan; })
            .prop('selected', true);
    }
}

var InitializeGraph = function (channel, timespan, start, end, callback) {

    $.ajax({ 
        url: '/config',
        type: 'get',
        dataType: 'json',
        cache: false,
        success: function (data) {
	        data = data.Circuits;
            var select = $("#circuits");
            for (var i = 0; i < data.length; i++) {
                select.append("<option value='" + data[i].id + "'>" + data[i].Name + "</option>");
            }

            if (channel != null) {
                $('#circuits option')
                    .filter(function (index) { return $(this).text() === channel; })
                    .prop('selected', true);
            }

            selectTimespanOption(timespan);

            if (timespan == "Custom") {
                if (start != null && end != null && start != "" && end != "") {
                    // set start and end time
                    $("#start").addClass('dontSelectCustom').datetimepicker('setDate', new Date(start)).removeClass('dontSelectCustom');
                    $("#end").addClass('dontSelectCustom').datetimepicker('setDate', new Date(end)).removeClass('dontSelectCustom');
                } else {
                    $('#Timespan option')
                        .filter(function (index) { return $(this).text() === "Hour"; })
                        .prop('selected', true);
                }
            }

            if ($.isFunction(callback))
                callback();
        }
    });

    $("<div id='tooltip'></div>").css({
			position: "absolute",
			display: "none",
			border: "1px solid #fdd",
			padding: "2px",
			"background-color": "#fee",
			opacity: 0.80
		}).appendTo("body");
}

var data, options, placeholder, lastTimespan="";

var RefreshGraph = function (circuitId, timespanDate, callback) {
    //CurrentScale = currentScale;
    placeholder = $("#placeholder");
    placeholder.empty();
    $("#table").empty();

    var elapsed = timespanDate.End - timespanDate.Start;

    if (elapsed == 0) {
        currentScale = 40;
        RefreshWaveformGraph(circuitId, currentScale, callback);
    } else  {
        if (lastTimespan == "Instant") {
            $(window).trigger('resize');
            console.log('resize');
        }
        lastTimespan = timespanDate.timespan;

        var groupBy;
        if (elapsed <= 1000*60*60*24)  // one day
            groupBy = null;
        else if (elapsed <= 1000*60*60*24*7)  // one week
            groupBy = 'hour';
        else if (elapsed <= 1000*60*60*24*31)  // one month
            groupBy = 'day';
        else
            //groupBy = 'day';
            groupBy = 'month';

        RefreshPowerGraph(circuitId, timespanDate.Start, timespanDate.End, groupBy, callback);
    } 
}

var GetBarGraphOptions = function (timeFormat, barWidth, minTickSize) {

    var options = {
        series: {
            bars: {
                show: true
            }
        },
        bars: {
            align: "center",
            barWidth: barWidth
        },
        xaxis: {
            //axisLabel: "Day of Month",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 12,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 10,
            //ticks: ticks'
            //mode: 'time', /*timezone: 'browser',*/timeformat: timeFormat, timeZoneOffset: (new Date()).getTimezoneOffset()
            mode: 'time', timezone: 'browser',timeformat: timeFormat
        },
        yaxis: {
            axisLabel: "Average Power",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 12,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3//,
            //            tickFormatter: function (v, axis) {
            //              return v + " Watts";
            //        }
        },
        legend: {
            noColumns: 0,
            labelBoxBorderColor: "#000000",
            position: "nw"
        },
        grid: {
            hoverable: true,
            borderWidth: 2,
            backgroundColor: { colors: ["#ffffff", "#EDF5FF"] }
        }
    };

    if (minTickSize != null)
        options.xaxis.minTickSize = minTickSize;

    return options;
}

var GetLineGraphOptions = function (timeFormat) {

    return {
        series: {
            lines: { show: true },
            points: { show: true, radius: 2},
            shadowSize: 0
        },
        xaxis: { mode: 'time', timezone: 'browser', timeformat: timeFormat },
        yaxes: [{ min: 0, tickFormatter: function (val, axis) { return val + " W"; } }],
        //yaxis: { min: -200, max: 200 }, //, zoomRange: [400, 400] },
        selection: { mode: "x" },
        crosshair: { mode: "x" },
        grid: { hoverable: true, autoHighlight: false }
        
        //zoom: { interactive: true }
    };
}

var RefreshPowerGraph = function (circuitId, start, end, groupBy, callback) {

    html = "";
    //var v = [], c = [];
    var p = [];

    var timeFormat;
    if (groupBy == 'hour') {
        timeFormat = '%b %e<br>%I:%M %p';
        //options = GetLineGraphOptions(timeFormat);
        options = GetBarGraphOptions(timeFormat, 1000 * 60 * 60);  // barwidth= 1 hour
    } else if (groupBy == 'day') {
        timeFormat = '%b %e';
        //options = GetLineGraphOptions(timeFormat);
        options = GetBarGraphOptions(timeFormat, 1000 * 60 * 60 * 24);  // barwidth= 1 day
    } else if (groupBy == 'month') {
        timeFormat = '%b';
        //options = GetLineGraphOptions(timeFormat);
        options = GetBarGraphOptions(timeFormat, 1000 * 60 * 60 * 24 * 30, [1, "month"]);  // barwidth= 1 month
    } else {
        timeFormat = '%I:%M %p';
        options = GetLineGraphOptions(timeFormat);
    }

    var offset = (new Date()).getTimezoneOffset();
    if (offset >= 0)
        offset = '-' + ('0' + (offset / 60)).slice(-2) + ':' + ('0' + (offset % 60)).slice(-2);
    else
        offset = ('0' + (-offset / 60)).slice(-2) + ':' + ('0' + (-offset % 60)).slice(-2);


    $.ajax({
        url: '/power?circuitId=' + circuitId + '&start=' + start.getTime() + '&end=' + end.getTime() + '&groupBy=' + groupBy + '&offset=' + offset,
        type: 'get',
        dataType: 'json',
        cache: false,
        success: function (result) {

        $('.header').text(result.DeviceName + " Power Meter");

	    if (result.ts.length > 0) {
            for (var i = 0; i < result.ts.length; i++) {
                p.push([result.ts[i] * 1000, result.P[i]]);
            }
	    }
            
            var Kwh = (result.avg / 1000) * ((end.getTime() - start.getTime()) / (1000 * 60 * 60));
            var cost = Number(result.Cost) * Kwh;

            html = "<tr><td>Min</td><td>" + result.min + " watts</td></tr>" +
                        "<tr><td>Avg</td><td>" + result.avg + " watts</td></tr>" +
                        "<tr><td>Max</td><td>" + result.max + " watts</td></tr>" +
                        "<tr><td>KWh</td><td>" + Kwh.toFixed(2) + "</td></tr>" + 
                        "<td>Cost</td><td>$" + cost.toFixed(2) + "</td></tr>";


            data = [{ data: p, label: "Watts = -0000.00", color: "#5482FF"}];

            placeholder.bind("plothover", function (event, pos, item) {
                latestPosition = pos;
                if (!updateLegendTimeout) {
                    updateLegendTimeout = setTimeout(updateLegend, 50);
                }
            });

            placeholder.dblclick(function () {
                options2.xaxis.min = null;
                options2.xaxis.max = null;
                plot = $.plot(placeholder, data, options);
		$('.legend table tbody').append(html);
            });

            placeholder.bind("plotselected", function (event, ranges) {

                $("#selection").text(ranges.xaxis.from.toFixed(1) + " to " + ranges.xaxis.to.toFixed(1));

                plot = $.plot(placeholder, data, $.extend(true, {}, options, {
                    xaxis: {
                        min: ranges.xaxis.from,
                        max: ranges.xaxis.to
                    }
                }));
		$('.legend table tbody').append(html);
            });

            placeholder.bind("plotunselected", function (event) {
                $("#selection").text("");
            });

            var plot = $.plot(placeholder, data, options);

            if ($.isFunction(callback))
                callback();

            //var axes = plot.getAxes();
	    //var o = plot.pointOffset({ x: (axes.xaxis.max+axes.xaxis.min)/2, y: (axes.yaxis.max+axes.yaxis.min)/2 });
            // Append it to the placeholder that Flot already uses for positioning
	    $('.legend table tbody').append(html);

	    placeholder.resize(function () {
		if (html != "")
			$('.legend table tbody').append(html);
             });

//            placeholder.append("<div style='position:absolute;left:" + (o.left + 4) + "px;top:" + o.top + "px;color:#666;font-size:smaller'>" + html + "</div>");


            var legends = placeholder.find(".legendLabel");

            legends.each(function () {
                // fix the widths so they don't jump around
                $(this).css('width', $(this).width());
            });

            var updateLegendTimeout = null;
            var latestPosition = null;

            function updateLegend() {

                updateLegendTimeout = null;

                var pos = latestPosition;

                var axes = plot.getAxes();
                if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max ||
				    pos.y < axes.yaxis.min || pos.y > axes.yaxis.max) {
                    return;
                }

                var i, j, dataset = plot.getData();
                for (i = 0; i < dataset.length; ++i) {

                    var series = dataset[i];

                    // Find the nearest points, x-wise

                    for (j = 0; j < series.data.length; ++j) {
                        if (series.data[j][0] > pos.x) {
                            break;
                        }
                    }

                    if (series.data.length > 0) {
                        // Now Interpolate
                        var y,
					    p1 = series.data[j - 1],
					    p2 = series.data[j];

                        if (p1 == null) {
                            y = p2[1];
                        } else if (p2 == null) {
                            y = p1[1];
                        } else {
                            //y = p1[1] + (p2[1] - p1[1]) * (pos.x - p1[0]) / (p2[0] - p1[0]);
                            if ((pos.x - p1[0]) < (p2[0] - pos.x))
                                y = p1[1];
                            else
                                y = p2[1];
                        }

                        legends.eq(i).text(series.label.replace(/=.*/, "= " + y.toFixed(2)));
                    }
                }


            }

        }
    });
}

var RefreshWaveformGraph = function (circuitId, currentScale, callback) {

    options = {
        series: {
            lines: { show: true },
            //points: { show: true },
            shadowSize: 0
        },
        xaxis: { min: 0, tickFormatter: function (val, axis) { return val + " ms"; } },
        yaxes: [{ /*min: -200, max: 200,*/tickFormatter: function (val, axis) { return val + " V"; } },
                    { position: 0, min: -currentScale, max: currentScale, tickFormatter: function (val, axis) { return val + " A"; } }],
        //yaxis: { min: -200, max: 200 }, //, zoomRange: [400, 400] },
        selection: { mode: "x" },
        crosshair: { mode: "x" },
        grid: { hoverable: true, autoHighlight: false }
        //zoom: { interactive: true }
    }

    var datasets = {}, PLOTALL = false, v = [], c = [];
    html = "";
    $.ajax({
        url: '/waveform?circuitId=' + circuitId,
        type: 'get',
        dataType: 'json',
        cache: false,
        success: function (result) {

            if (result && result.DeviceName)
                $('.header').text(result.DeviceName + " Power Meter");
            else
                $('.header').text("Power Meter");

            if (PLOTALL) {
                var choiceContainer = $("#choices");
                choiceContainer.empty();
                if (result != null) {

                    $.each(result.Probes, function (index) {
                        var obj = result.Probes[index];
                        choiceContainer.append("<br/><input type='checkbox' name='" + obj.id + "' checked='checked' id='id" + obj.id + "'></input>" + "<label for='id" + obj.id + "'>" + obj.id + "</label>");

                        var v = [], c = [], vref = [];
                        var sample = result.Samples[index];
                        for (var i = 0; i < sample.tsInst.length; i++) {
                            var now = sample.tsInst[i];
                            if (sample.vInst.length >= i)
                                v.push([now, sample.vInst[i]]);
                            if (sample.iInst.length >= i)
                                c.push([now, sample.iInst[i]]);
                        }

                        var channel = { v: v, c: c };
                        datasets[obj.id] = channel;
                    });

                    if (lastTimespan != "Instant") {
                        console.log('resize');
                        $(window).trigger('resize');
                    }
                }

                function plotAccordingToChoices() {

                    var data = [];

                    choiceContainer.find("input:checked").each(function () {
                        var key = $(this).attr("name");
                        if (key && datasets[key]) {
                            //data.push(datasets[key]);
                            data.push({ data: datasets[key].v, label: "Volts = -000.00", points: { show: true, radius: 2} });
                            data.push({ data: datasets[key].c, label: "Amps = -000.00", yaxis: 2, points: { show: true, radius: 2} });
                        }
                    });

                    if (data.length > 0) {
                        var plot = $.plot(placeholder, data, options);
                    }
                }


                choiceContainer.find("input").click(plotAccordingToChoices);
                plotAccordingToChoices();

            } else {

                if (result != null && result.Samples != null && result.Samples.length > 0) {
                    for (var i = 0; i < result.Samples[0].tsInst.length; i++) {
                        var now = result.Samples[0].tsInst[i];
                        if (result.Samples[0].vInst.length >= i)
                            v.push([now, result.Samples[0].vInst[i]]);
                        if (result.Samples[0].iInst.length >= i)
                            c.push([now, result.Samples[0].iInst[i]]);
                    }

                    function getProbeValues(samples, property, includeTotal, digits) {
                        var result = "";
                        var total = 0;
                        for (var i = 0; i < samples.length; i++) {
                            if (i > 0)
                                result += ", ";
                            result += samples[i][property].toFixed(digits);
                            total += samples[i][property];
                        }

                        if (includeTotal) {
                            result += " (" + total.toFixed(digits) + ")";
                        }
                        return result;
                    }

                    var html = "<table><td><table><tr><td>Rms Voltage</td><td>" + getProbeValues(Samples, "vRms", false, 1) + " volts" +
                                "</td></tr><tr><td>Rms Current</td><td>" + getProbeValues(Samples, "iRms", false, 1) + " amps" +
                                "</td></tr><tr><td>Peak Voltage</td><td>" + getProbeValues(Samples, "vPeak", false, 1) + " volts" +
                                "</td></tr><tr><td>Peak Current</td><td>" + getProbeValues(Samples, "iPeak", false, 1) + " amps" +
                                "</td></tr></table></td><td><table><tr><td>Average real power</td><td>" + getProbeValues(Samples, "pAve", true, 1) + " watts" +
                                "</td></tr><tr><td>Average reactive power</td><td>" + getProbeValues(Samples, "qAve", true, 1) + " vars" +
                                "</td></tr><tr><td>Power factor</td><td>" + getProbeValues(Samples, "pf", false, 6) +
                                "</td></tr><tr><td>Timestamp</td><td>" + (new Date(result.Samples[0].ts)).toLocaleString() +
                                "</td></tr></table></td></table>";

                    //var html =  "<table><td><table><tr><td>Rms Voltage</td><td>" + result.Samples[0].vRms.toFixed(1) + " volts" +
                    //            "</td></tr><tr><td>Rms Current</td><td>" + result.Samples[0].iRms.toFixed(1) + " amps" +
                    //            "</td></tr><tr><td>Peak Voltage</td><td>" + result.Samples[0].vPeak.toFixed(1) + " volts" +
                    //            "</td></tr><tr><td>Peak Current</td><td>" + result.Samples[0].iPeak.toFixed(1) + " amps" +
                    //            "</td></tr></table></td><td><table><tr><td>Average real power</td><td>" + result.pAve.toFixed(1) + " watts" +
                    //            "</td></tr><tr><td>Average reactive power</td><td>" + result.qAve.toFixed(1) + " vars" +
                    //            "</td></tr><tr><td>Power factor</td><td>" + result.pf.toFixed(6) +
                    //            "</td></tr><tr><td>Timestamp</td><td>" + (new Date(result.Samples[0].ts)).toLocaleString() +
                    //            "</td></tr></table></td></table>";

                    /*$("#tooltip").html(html)
						//.css({ top: item.pageY + 5, left: item.pageX + 5 })
                        .css({ top: 200, left: 200 })
						.fadeIn(200);*/

                    $("#table").html(html);

                    if (lastTimespan != "Instant") {
                        console.log('resize');
                        $(window).trigger('resize');
                    }

                }

                lastTimespan = "Instant";



                data = [{ data: v, label: "Volts = -000.00", points: { show: true, radius: 2} },
                    { data: c, label: "Amps = -000.00", yaxis: 2, points: { show: true, radius: 2} },
                //                    { data: vref, label: "ref voltage = -000.00", lines: { show: true } }
            ];



                placeholder.bind("plothover", function (event, pos, item) {
                    latestPosition = pos;
                    if (!updateLegendTimeout) {
                        updateLegendTimeout = setTimeout(updateLegend, 50);
                    }
                });

                placeholder.dblclick(function () {
                    options.xaxis.min = null;
                    options.xaxis.max = null;
                    plot = $.plot(placeholder, data, options);
		    
                });

                placeholder.bind("plotselected", function (event, ranges) {

                    $("#selection").text(ranges.xaxis.from.toFixed(1) + " to " + ranges.xaxis.to.toFixed(1));

                    plot = $.plot(placeholder, data, $.extend(true, {}, options, {
                        xaxis: {
                            min: ranges.xaxis.from,
                            max: ranges.xaxis.to
                        }
                    }));
		    
                });

                placeholder.bind("plotunselected", function (event) {
                    $("#selection").text("");
                });

                var plot = $.plot(placeholder, data, options);

                if ($.isFunction(callback))
                    callback();


                var legends = placeholder.find(".legendLabel");

                legends.each(function () {
                    // fix the widths so they don't jump around
                    $(this).css('width', $(this).width());
                });

                var updateLegendTimeout = null;
                var latestPosition = null;

                function updateLegend() {

                    updateLegendTimeout = null;

                    var pos = latestPosition;

                    var axes = plot.getAxes();
                    if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max || pos.y < axes.yaxis.min || pos.y > axes.yaxis.max) {
                        return;
                    }

                    var i, j, dataset = plot.getData();
                    for (i = 0; i < dataset.length; ++i) {

                        var series = dataset[i];

                        // Find the nearest points, x-wise

                        for (j = 0; j < series.data.length; ++j) {
                            if (series.data[j][0] > pos.x) {
                                break;
                            }
                        }

                        if (series.data.length > 0) {
                            // Now Interpolate
                            var y, p1 = series.data[j - 1], p2 = series.data[j];

                            if (p1 == null) {
                                y = p2[1];
                            } else if (p2 == null) {
                                y = p1[1];
                            } else {
                                y = p1[1] + (p2[1] - p1[1]) * (pos.x - p1[0]) / (p2[0] - p1[0]);
                            }

                            legends.eq(i).text(series.label.replace(/=.*/, "= " + y.toFixed(2)));

                        }
                    }
                }
            }
        }
    });
}

var ResizeGraphs = function () {
    if (data != null) {
        var plot = $.plot($("#placeholder"), data, options);
        if (html != "")
		$('.legend table tbody').append(html);
    }
}