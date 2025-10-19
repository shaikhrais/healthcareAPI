# Healthcare API Development Tools
# PowerShell script for managing development workflow and code generation

param(
    [Parameter(Position=0)]
    [string]$Command,
    
    [Parameter(Position=1)]
    [string]$Module,
    
    [Parameter(Position=2)]
    [string]$Feature,
    
    [switch]$Help
)

# Colors for output
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Cyan"
$WHITE = "White"

function Write-ColorOutput {
    param($Message, $Color = $WHITE)
    Write-Host $Message -ForegroundColor $Color
}

function Show-Help {
    Write-ColorOutput "🏥 Healthcare API Development Tools" $BLUE
    Write-ColorOutput "=================================" $BLUE
    Write-Host ""
    Write-ColorOutput "ANALYSIS COMMANDS:" $YELLOW
    Write-Host "  .\dev-tools.ps1 analyze              - Analyze entire codebase for patterns"
    Write-Host "  .\dev-tools.ps1 status               - Show current project status"
    Write-Host "  .\dev-tools.ps1 docs-check           - Check documentation coverage"
    Write-Host ""
    Write-ColorOutput "CODE GENERATION:" $YELLOW
    Write-Host "  .\dev-tools.ps1 prompt <module> <feature>    - Generate AI prompt for feature"
    Write-Host "  .\dev-tools.ps1 template <module> <feature>  - Generate code template"
    Write-Host "  .\dev-tools.ps1 swagger <module> <feature>   - Generate Swagger docs"
    Write-Host ""
    Write-ColorOutput "PROJECT MANAGEMENT:" $YELLOW
    Write-Host "  .\dev-tools.ps1 sprint-start         - Initialize new sprint"
    Write-Host "  .\dev-tools.ps1 sprint-status        - Show sprint progress"
    Write-Host "  .\dev-tools.ps1 quality-check        - Run quality assurance checks"
    Write-Host ""
    Write-ColorOutput "EXAMPLES:" $GREEN
    Write-Host "  .\dev-tools.ps1 analyze"
    Write-Host "  .\dev-tools.ps1 prompt patients appointments"
    Write-Host "  .\dev-tools.ps1 template billing invoices"
    Write-Host "  .\dev-tools.ps1 status"
}

function Invoke-CodebaseAnalysis {
    Write-ColorOutput "🔍 Analyzing Healthcare API Codebase..." $BLUE
    
    if (Test-Path "tools\code-generator.js") {
        node tools\code-generator.js analyze
    } else {
        Write-ColorOutput "❌ Code generator not found. Please ensure tools/code-generator.js exists." $RED
    }
}

function Show-ProjectStatus {
    Write-ColorOutput "📊 Healthcare API Project Status" $BLUE
    Write-ColorOutput "================================" $BLUE
    
    # Count route files
    $routeFiles = Get-ChildItem -Path "src\modules\*\routes\*.js" -Recurse | Measure-Object
    $totalFiles = $routeFiles.Count
    
    # Check for documented files (containing @swagger)
    $documentedFiles = Get-ChildItem -Path "src\modules\*\routes\*.js" -Recurse | 
        Where-Object { (Get-Content $_.FullName -Raw) -match "@swagger" } | 
        Measure-Object
    $documented = $documentedFiles.Count
    
    # Calculate coverage
    $coverage = if ($totalFiles -gt 0) { [math]::Round(($documented / $totalFiles) * 100, 1) } else { 0 }
    
    Write-Host ""
    Write-ColorOutput "📁 Files:" $YELLOW
    Write-Host "  Total Route Files: $totalFiles"
    Write-Host "  Documented Files: $documented"
    Write-Host "  Coverage: $coverage%"
    
    # Count endpoints (approximate)
    Write-Host ""
    Write-ColorOutput "🔗 Endpoints:" $YELLOW
    $endpointPattern = "router\.(get|post|put|patch|delete)"
    $totalEndpoints = 0
    
    Get-ChildItem -Path "src\modules\*\routes\*.js" -Recurse | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        $routeMatches = [regex]::Matches($content, $endpointPattern)
        $totalEndpoints += $routeMatches.Count
    }
    
    Write-Host "  Total Endpoints: $totalEndpoints"
    
    # Show modules
    Write-Host ""
    Write-ColorOutput "📦 Modules:" $YELLOW
    $modules = Get-ChildItem -Path "src\modules" -Directory | Select-Object -ExpandProperty Name
    Write-Host "  Available: $($modules -join ', ')"
    
    # Show recent activity
    Write-Host ""
    Write-ColorOutput "📈 Recent Activity:" $YELLOW
    $recentFiles = Get-ChildItem -Path "src\modules\*\routes\*.js" -Recurse | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -First 5 | 
        ForEach-Object { "  $($_.Name) ($(($_.LastWriteTime).ToString('MM/dd HH:mm')))" }
    
    $recentFiles | ForEach-Object { Write-Host $_ }
}

function Test-DocumentationCoverage {
    Write-ColorOutput "📚 Documentation Coverage Analysis" $BLUE
    Write-ColorOutput "==================================" $BLUE
    
    $undocumentedFiles = @()
    $documentedFiles = @()
    
    Get-ChildItem -Path "src\modules\*\routes\*.js" -Recurse | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        $relativePath = $_.FullName.Replace((Get-Location).Path + "\", "")
        
        if ($content -match "@swagger") {
            $documentedFiles += $relativePath
        } else {
            $undocumentedFiles += $relativePath
        }
    }
    
    Write-Host ""
    Write-ColorOutput "✅ Documented Files ($($documentedFiles.Count)):" $GREEN
    $documentedFiles | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }
    
    Write-Host ""
    Write-ColorOutput "❌ Undocumented Files ($($undocumentedFiles.Count)):" $RED
    $undocumentedFiles | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    
    Write-Host ""
    $coverage = [math]::Round(($documentedFiles.Count / ($documentedFiles.Count + $undocumentedFiles.Count)) * 100, 1)
    Write-ColorOutput "📊 Overall Coverage: $coverage%" $BLUE
}

function New-AIPrompt {
    param($ModuleName, $FeatureName)
    
    Write-ColorOutput "🤖 Generating AI Prompt for $ModuleName/$FeatureName..." $BLUE
    
    if (Test-Path "tools\code-generator.js") {
        node tools\code-generator.js prompt $ModuleName $FeatureName
        
        # Save prompt to file for easy access
        $promptFile = "generated-prompt-$ModuleName-$FeatureName.md"
        Write-ColorOutput "💾 Prompt saved to: $promptFile" $GREEN
    } else {
        Write-ColorOutput "❌ Code generator not found." $RED
    }
}

function New-CodeTemplate {
    param($ModuleName, $FeatureName)
    
    Write-ColorOutput "📄 Generating Code Template for $ModuleName/$FeatureName..." $BLUE
    
    if (Test-Path "tools\code-generator.js") {
        node tools\code-generator.js template $ModuleName $FeatureName
        
        Write-ColorOutput "✅ Template generated successfully!" $GREEN
        Write-ColorOutput "Next steps:" $YELLOW
        Write-Host "  1. Review the generated template"
        Write-Host "  2. Customize business logic"
        Write-Host "  3. Add proper validation"
        Write-Host "  4. Write unit tests"
        Write-Host "  5. Test endpoints manually"
    } else {
        Write-ColorOutput "❌ Code generator not found." $RED
    }
}

function New-SwaggerDocs {
    param($ModuleName, $FeatureName)
    
    Write-ColorOutput "📖 Generating Swagger Documentation for $ModuleName/$FeatureName..." $BLUE
    
    # Create basic swagger template
    $swaggerTemplate = @"
/**
 * @swagger
 * components:
 *   schemas:
 *     $($FeatureName.Substring(0,1).ToUpper() + $FeatureName.Substring(1)):
 *       type: object
 *       required:
 *         - field1
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier
 *         field1:
 *           type: string
 *           description: Description of field1
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/${ModuleName}/${FeatureName}:
 *   get:
 *     summary: Get $FeatureName records
 *     tags:
 *       - $($ModuleName.Substring(0,1).ToUpper() + $ModuleName.Substring(1))
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     `$ref: '#/components/schemas/$($FeatureName.Substring(0,1).ToUpper() + $FeatureName.Substring(1))'
 *       401:
 *         description: Unauthorized
 */
"@

    $swaggerFile = "swagger-$ModuleName-$FeatureName.js"
    $swaggerTemplate | Out-File -FilePath $swaggerFile -Encoding utf8
    
    Write-ColorOutput "✅ Swagger template generated: $swaggerFile" $GREEN
}

function Start-Sprint {
    Write-ColorOutput "🚀 Starting New Sprint..." $BLUE
    
    # Create sprint directory
    $sprintDate = Get-Date -Format "yyyy-MM-dd"
    $sprintDir = "sprints\sprint-$sprintDate"
    
    if (!(Test-Path $sprintDir)) {
        New-Item -ItemType Directory -Path $sprintDir -Force | Out-Null
        Write-ColorOutput "📁 Created sprint directory: $sprintDir" $GREEN
    }
    
    # Generate sprint planning template
    $sprintTemplate = @"
# Sprint Planning - $sprintDate

## Sprint Goals
- [ ] Goal 1: Complete documentation for X files
- [ ] Goal 2: Implement feature Y
- [ ] Goal 3: Fix critical bugs

## Team Assignments

### SDE1 Tasks
- [ ] Task 1: Add Swagger docs to file A
- [ ] Task 2: Implement input validation for endpoint B
- [ ] Task 3: Write unit tests for feature C

### SDE2 Tasks  
- [ ] Task 1: Design architecture for feature X
- [ ] Task 2: Code review and mentoring
- [ ] Task 3: Performance optimization for module Y

## Definition of Done
- [ ] Code reviewed and approved
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Swagger docs added
- [ ] Security review completed

## Sprint Metrics
- Planned Story Points: TBD
- Team Velocity: TBD
- Completion Target: 90%
"@

    $planningFile = "$sprintDir\sprint-planning.md"
    $sprintTemplate | Out-File -FilePath $planningFile -Encoding utf8
    
    Write-ColorOutput "📋 Sprint planning template created: $planningFile" $GREEN
    Write-ColorOutput "Next steps:" $YELLOW
    Write-Host "  1. Fill in sprint goals and tasks"
    Write-Host "  2. Assign story points"
    Write-Host "  3. Conduct sprint planning meeting"
    Write-Host "  4. Begin development work"
}

function Show-SprintStatus {
    Write-ColorOutput "📊 Sprint Status" $BLUE
    Write-ColorOutput "===============" $BLUE
    
    # Find latest sprint
    $latestSprint = Get-ChildItem -Path "sprints" -Directory -ErrorAction SilentlyContinue | 
        Sort-Object Name -Descending | 
        Select-Object -First 1
    
    if ($latestSprint) {
        Write-Host "Current Sprint: $($latestSprint.Name)"
        
        $planningFile = "$($latestSprint.FullName)\sprint-planning.md"
        if (Test-Path $planningFile) {
            $content = Get-Content $planningFile -Raw
            
            # Count completed tasks
            $totalTasks = ([regex]::Matches($content, "- \[[ x]\]")).Count
            $completedTasks = ([regex]::Matches($content, "- \[x\]")).Count
            
            $completion = if ($totalTasks -gt 0) { [math]::Round(($completedTasks / $totalTasks) * 100, 1) } else { 0 }
            
            Write-Host "Progress: $completedTasks/$totalTasks tasks ($completion%)"
            
            if ($completion -ge 90) {
                Write-ColorOutput "🎉 Sprint on track!" $GREEN
            } elseif ($completion -ge 70) {
                Write-ColorOutput "⚠️ Sprint needs attention" $YELLOW
            } else {
                Write-ColorOutput "🚨 Sprint at risk" $RED
            }
        }
    } else {
        Write-ColorOutput "No active sprint found. Use 'sprint-start' to begin." $YELLOW
    }
}

function Invoke-QualityCheck {
    Write-ColorOutput "🔍 Running Quality Assurance Checks..." $BLUE
    Write-ColorOutput "=====================================" $BLUE
    
    $issues = @()
    
    # Check for console.log statements
    Write-Host "Checking for console.log statements..."
    $consoleLogFiles = Get-ChildItem -Path "src" -Recurse -Include "*.js" | 
        Where-Object { (Get-Content $_.FullName -Raw) -match "console\.log" }
    
    if ($consoleLogFiles) {
        $issues += "Console.log statements found in $($consoleLogFiles.Count) files"
        Write-ColorOutput "⚠️ Console.log statements found in:" $YELLOW
        $consoleLogFiles | ForEach-Object { Write-Host "  $($_.FullName)" -ForegroundColor Yellow }
    }
    
    # Check for TODO comments
    Write-Host "`nChecking for TODO comments..."
    $todoFiles = Get-ChildItem -Path "src" -Recurse -Include "*.js" | 
        Where-Object { (Get-Content $_.FullName -Raw) -match "TODO|FIXME" }
    
    if ($todoFiles) {
        $issues += "TODO/FIXME comments found in $($todoFiles.Count) files"
    }
    
    # Check for missing error handling
    Write-Host "`nChecking for missing error handling..."
    $noTryCatchFiles = Get-ChildItem -Path "src\modules\*\routes\*.js" -Recurse | 
        Where-Object { 
            $content = Get-Content $_.FullName -Raw
            $content -match "async.*=>" -and $content -notmatch "try.*catch"
        }
    
    if ($noTryCatchFiles) {
        $issues += "Missing try-catch in $($noTryCatchFiles.Count) async route files"
    }
    
    # Summary
    Write-Host ""
    if ($issues.Count -eq 0) {
        Write-ColorOutput "✅ All quality checks passed!" $GREEN
    } else {
        Write-ColorOutput "⚠️ Quality Issues Found:" $RED
        $issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    }
}

# Main execution
if ($Help -or !$Command) {
    Show-Help
    exit
}

switch ($Command.ToLower()) {
    "analyze" { 
        Invoke-CodebaseAnalysis 
    }
    "status" { 
        Show-ProjectStatus 
    }
    "docs-check" { 
        Test-DocumentationCoverage 
    }
    "prompt" {
        if (!$Module -or !$Feature) {
            Write-ColorOutput "❌ Module and feature names are required." $RED
            Write-Host "Usage: .\dev-tools.ps1 prompt <module> <feature>"
            exit 1
        }
        New-AIPrompt $Module $Feature
    }
    "template" {
        if (!$Module -or !$Feature) {
            Write-ColorOutput "❌ Module and feature names are required." $RED
            Write-Host "Usage: .\dev-tools.ps1 template <module> <feature>"
            exit 1
        }
        New-CodeTemplate $Module $Feature
    }
    "swagger" {
        if (!$Module -or !$Feature) {
            Write-ColorOutput "❌ Module and feature names are required." $RED
            Write-Host "Usage: .\dev-tools.ps1 swagger <module> <feature>"
            exit 1
        }
        New-SwaggerDocs $Module $Feature
    }
    "sprint-start" { 
        Start-Sprint 
    }
    "sprint-status" { 
        Show-SprintStatus 
    }
    "quality-check" { 
        Invoke-QualityCheck 
    }
    default {
        Write-ColorOutput "❌ Unknown command: $Command" $RED
        Write-Host ""
        Show-Help
        exit 1
    }
}