@echo off
echo =====================================
echo IMS Unit Testing Execution Script
echo =====================================
echo.

echo [1/3] Running unit tests with coverage...
call ng test --code-coverage --watch=false --browsers=ChromeHeadless

echo.
echo [2/3] Generating test summary...
echo Test execution completed at %date% %time% > test-execution-log.txt
echo Check coverage/i_m_s/index.html for detailed coverage report >> test-execution-log.txt

echo.
echo [3/3] Opening coverage report...
start coverage\i_m_s\index.html

echo.
echo =====================================
echo Test execution completed!
echo =====================================
echo.
echo Generated files:
echo - Coverage Report: coverage/i_m_s/index.html
echo - Test Report: TEST_REPORT.md
echo - Execution Log: test-execution-log.txt
echo.
pause
