HTMLWidgets.widget({

  name: 'collapsibleTree',
  type: 'output',

  factory: function(el, width, height) {

    // create our tree object and bind it to the element
    // Set the dimensions and margins of the diagram
    var margin = {top: 20, right: 50, bottom: 30, left: 90},
    width = width - margin.left - margin.right,
    height = height - margin.top - margin.bottom;

    // append the svg object to the body of the page
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin
    var svg = d3.select(el).append('svg')
    .attr('width', width + margin.right + margin.left)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate('
    + margin.left + ',' + margin.top + ')');

    // Define the div for the tooltip
    var tooltip = d3.select(el).append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);

    var i = 0,
    duration = 750;

    // declares a tree layout and assigns the size
    var treemap = d3.tree().size([height, width]);

    function update(root, source, options) {

      // Assigns the x and y position for the nodes
      var treeData = treemap(root);

      // Compute the new tree layout.
      var nodes = treeData.descendants(),
      links = treeData.descendants().slice(1);

      // Normalize for fixed-depth.
      nodes.forEach(function(d) {d.y = d.depth * options.linkLength});

      // ****************** Nodes section ***************************

      // Update the nodes...
      var node = svg.selectAll('g.node')
      .data(nodes, function(d) {return d.id || (d.id = ++i); });

      // Enter any new modes at the parent's previous position.
      var nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr('transform', function(d) {
        return 'translate(' + source.y0 + ',' + source.x0 + ')';
      })
      .on('click', click)
      .on('mouseover', mouseover)
      .on('mouseout', mouseout);

      // Add Circle for the nodes
      nodeEnter.append('circle')
      .attr('class', 'node')
      .attr('r', 1e-6)
      .style('fill', function(d) {
        return d.data.fill || (d._children ? options.fill : '#fff');
      })
      .style('stroke-width', function(d) {
        return d._children ? 3 : 1;
      });

      // Add labels for the nodes
      nodeEnter.append('text')
      .attr('dy', '.35em')
      .attr('x', function(d) {
        return d.children || d._children ? -13 : 13;
      })
      .attr('text-anchor', function(d) {
        return d.children || d._children ? 'end' : 'start';
      })
      .style('font-size', options.fontSize + 'px')
      .text(function(d) { return d.data.name; });

      // UPDATE
      var nodeUpdate = nodeEnter.merge(node);

      // Transition to the proper position for the node
      nodeUpdate.transition()
      .duration(duration)
      .attr('transform', function(d) {
        return 'translate(' + d.y + ',' + d.x + ')';
      });

      // Update the node attributes and style
      nodeUpdate.select('circle.node')
      .attr('r', 10)
      .style('fill', function(d) {
        return d.data.fill || (d._children ? options.fill : '#fff');
      })
      .style('stroke-width', function(d) {
        return d._children ? 3 : 1;
      })
      .attr('cursor', 'pointer');


      // Remove any exiting nodes
      var nodeExit = node.exit().transition()
      .duration(duration)
      .attr('transform', function(d) {
        return 'translate(' + source.y + ',' + source.x + ')';
      })
      .remove();

      // On exit reduce the node circles size to 0
      nodeExit.select('circle')
      .attr('r', 1e-6);

      // On exit reduce the opacity of text labels
      nodeExit.select('text')
      .style('fill-opacity', 1e-6);

      // ****************** links section ***************************

      // Update the links...
      var link = svg.selectAll('path.link')
      .data(links, function(d) { return d.id; });

      // Enter any new links at the parent's previous position.
      var linkEnter = link.enter().insert('path', 'g')
      .attr('class', 'link')
      .attr('d', function(d){
        var o = {x: source.x0, y: source.y0}
        return diagonal(o, o)
      });

      // UPDATE
      var linkUpdate = linkEnter.merge(link);

      // Transition back to the parent element position
      linkUpdate.transition()
      .duration(duration)
      .attr('d', function(d){ return diagonal(d, d.parent) });

      // Remove any exiting links
      var linkExit = link.exit().transition()
      .duration(duration)
      .attr('d', function(d) {
        var o = {x: source.x, y: source.y}
        return diagonal(o, o)
      })
      .remove();

      // Store the old positions for transition.
      nodes.forEach(function(d){
        d.x0 = d.x;
        d.y0 = d.y;
      });

      // Creates a curved (diagonal) path from parent to the child nodes
      function diagonal(s, d) {

        path = 'M ' + s.y + ' ' + s.x + ' C ' +
        (s.y + d.y) / 2 + ' ' + s.x + ', ' +
        (s.y + d.y) / 2 + ' ' + d.x + ', ' +
        d.y + ' ' + d.x;

        return path
      }

      // Toggle children on click.
      function click(d) {
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
          d._children = null;
        }
        update(root, d, options || null);
        // Hide the tooltip after clicking
        tooltip.transition()
        .duration(100)
        .style('opacity', 0)
        // Update Shiny inputs, if applicable
        if (options.input!==null) {
          var nest = {},
          obj = d; // is this necessary?
          // Navigate down the list and recursively find parental nodes
          for (var n = d.depth; n > 0; n--) {
            nest[options.hierarchy[n-1]] = obj.data.name
            obj = obj.parent
          }
          Shiny.onInputChange(options.input, nest)
        }
      }

      // Show tooltip on mouseover
      function mouseover(d) {
        if (!options.tooltip) {return}
        tooltip.transition()
        .duration(200)
        .style('opacity', .9);

        tooltip.html(
          d.data.name + '<br>' +
          options.attribute + ': ' + d.data.WeightOfNode
        )
        // Make the tooltip font size just a little bit bigger
        .style('font-size', (options.fontSize + 1) + 'px')
        .style('left', d3.event.pageX + 'px')
        .style('top', (d3.event.pageY - 28) + 'px');
      }
      // Hide tooltip on mouseout
      function mouseout(d) {
        if (!options.tooltip) {return}
        tooltip.transition()
        .duration(500)
        .style('opacity', 0);
      }
    }

    return {
      renderValue: function(x) {
        // Assigns parent, children, height, depth
        root = d3.hierarchy(x.data, function(d) { return d.children; });
        root.x0 = height / 2;
        root.y0 = 0;

        // Collapse after the second level
        root.children.forEach(collapse);
        update(root, root, x.options);

        // Collapse the node and all it's children
        function collapse(d) {
          if(d.children) {
            d._children = d.children
            d._children.forEach(collapse)
            d.children = null
          }
        }
      },

      resize: function(width, height) {
        // Resize the canvas
        d3.select(el).select('svg')
        .attr('width', width)
        .attr('height', height);

        // Update the treemap to fit the new canvas size
        treemap = d3.tree().size([height, width]);
      },

      // Make the svg object available as a property on the widget
      // instance we're returning from factory(). This is generally a
      // good idea for extensibility--it helps users of this widget
      // interact directly with the svg, if needed.
      svg: svg
    };
  }
});
