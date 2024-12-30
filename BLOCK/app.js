// Create the HTML structure
document.body.innerHTML = `
  <div id="legend">
    <button id="add-block-btn">Add Block</button>
    <button id="add-input-port-btn">Add Input Port</button>
    <button id="add-output-port-btn">Add Output Port</button>
    <button id="add-line-btn">Add Line</button>
    <button id="delete-btn">Delete Selected</button>
  </div>
  <canvas id="c" width="800" height="600" style="border:1px solid #ccc;"></canvas>
`;

// Include Fabric.js library by creating a script tag
const fabricScript = document.createElement('script');
fabricScript.src = "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.2.4/fabric.min.js";
document.head.appendChild(fabricScript);

// Ensure Fabric.js is loaded before running the app code
fabricScript.onload = () => {
    // Initialize Fabric.js canvas
    const canvas = new fabric.Canvas('c', { selection: true });

    // Variables to keep track of the current action
    let isDrawingLine = false;
    let line;
    let selectedBlock = null;

    // Event Handlers for Buttons
    document.getElementById('add-block-btn').addEventListener('click', addBlock);
    document.getElementById('add-input-port-btn').addEventListener('click', () => addPort('input'));
    document.getElementById('add-output-port-btn').addEventListener('click', () => addPort('output'));
    document.getElementById('add-line-btn').addEventListener('click', () => {
        isDrawingLine = true;
        canvas.defaultCursor = 'crosshair';
        canvas.discardActiveObject();
    });
    document.getElementById('delete-btn').addEventListener('click', deleteSelected);

    // Function to add a block
    function addBlock() {
        const color = prompt('Enter block color:', 'blue') || 'blue';
        const width = parseInt(prompt('Enter block width:', '100')) || 100;
        const height = parseInt(prompt('Enter block height:', '60')) || 60;
        const textContent = prompt('Enter block text:', 'Block') || 'Block';

        const block = new fabric.Rect({
            fill: color,
            width: width,
            height: height,
            originX: 'center',
            originY: 'center',
        });

        const text = new fabric.Textbox(textContent, {
            fontSize: 16,
            fill: '#fff',
            originX: 'center',
            originY: 'center',
            editable: true,
        });

        const group = new fabric.Group([block, text], {
            left: 100,
            top: 100,
            hasControls: true,
            lockScalingFlip: true,
        });

        group.objectType = 'block'; // Custom property to identify blocks

        canvas.add(group);
        canvas.setActiveObject(group);
        selectedBlock = group;

        // Allow nesting blocks into other blocks
        group.on('moving', handleNesting);

        // Allow editing text after placement
        text.on('editing:entered', () => {
            group.lockMovementX = group.lockMovementY = true;
        });
        text.on('editing:exited', () => {
            group.lockMovementX = group.lockMovementY = false;
        });
    }

    // Function to add a port to a selected block
    function addPort(portType) {
        if (!selectedBlock) {
            alert('Please select a block to add a port.');
            return;
        }

        const portLabel = prompt('Enter port label:', portType === 'input' ? 'Input' : 'Output') || (portType === 'input' ? 'Input' : 'Output');
        const portSize = parseInt(prompt('Enter port size:', '10')) || 10;

        // Set color based on port type
        const portColor = portType === 'input' ? 'red' : 'green';

        const port = new fabric.Rect({
            width: portSize,
            height: portSize,
            fill: portColor,
            originX: 'center',
            originY: 'center',
        });

        const label = new fabric.Textbox(portLabel, {
            fontSize: 12,
            fill: 'black',
            originX: 'center',
            originY: 'center',
            top: port.top + portSize,
            editable: true,
        });

        const portGroup = new fabric.Group([port, label], {
            left: selectedBlock.left + (portType === 'input' ? -portSize * 2 : selectedBlock.width * selectedBlock.scaleX + portSize * 2),
            top: selectedBlock.top + (selectedBlock.height * selectedBlock.scaleY) / 2,
            hasControls: true,
        });

        portGroup.objectType = 'port'; // Custom property to identify ports

        canvas.add(portGroup);
        selectedBlock.addWithUpdate(portGroup);

        // Allow editing text after placement
        label.on('editing:entered', () => {
            portGroup.lockMovementX = portGroup.lockMovementY = true;
        });
        label.on('editing:exited', () => {
            portGroup.lockMovementX = portGroup.lockMovementY = false;
        });

        selectedBlock.setCoords();
        canvas.renderAll();
    }

    // Function to handle nesting of blocks
    function handleNesting() {
        const activeObject = this;
        canvas.forEachObject(function (obj) {
            if (obj === activeObject) return;

            if (obj.objectType === 'block') {
                const blockRect = obj.item(0);
                if (blockRect && typeof blockRect.set === 'function') {
                    if (activeObject.intersectsWithObject(obj) || activeObject.isContainedWithinObject(obj)) {
                        blockRect.set('stroke', 'green');
                    } else {
                        blockRect.set('stroke', null);
                    }
                }
            }
        });
        canvas.renderAll();
    }

    // Remove block highlight on mouse up
    canvas.on('mouse:up', function () {
        canvas.forEachObject(function (obj) {
            if (obj.objectType === 'block') {
                const blockRect = obj.item(0);
                if (blockRect && typeof blockRect.set === 'function') {
                    blockRect.set('stroke', null);
                }
            }
        });
        canvas.renderAll();
    });

    // Mouse event handlers for drawing lines
    canvas.on('mouse:down', function (opt) {
        if (isDrawingLine) {
            const pointer = canvas.getPointer(opt.e);
            const points = [pointer.x, pointer.y, pointer.x, pointer.y];

            line = new fabric.Line(points, {
                stroke: 'black',
                strokeWidth: 2,
                selectable: false,
                evented: false,
                originX: 'center',
                originY: 'center',
            });

            canvas.add(line);
        } else if (!opt.target) {
            // Deselect objects when clicking on empty space
            canvas.discardActiveObject();
            canvas.requestRenderAll();
        } else if (opt.target.objectType === 'block') {
            selectedBlock = opt.target;
        }
    });

    canvas.on('mouse:move', function (opt) {
        if (!isDrawingLine) return;
        const pointer = canvas.getPointer(opt.e);
        line.set({ x2: pointer.x, y2: pointer.y });
        canvas.renderAll();
    });

    canvas.on('mouse:up', function () {
        if (isDrawingLine) {
            isDrawingLine = false;
            canvas.defaultCursor = 'default';

            // Make the line selectable and movable
            line.set({
                selectable: true,
                evented: true,
            });

            // Add event listeners to the line for movement
            line.on('selected', function () {
                line.set({
                    strokeDashArray: [5, 5], // Visual feedback when selected
                });
            });

            line