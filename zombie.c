#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>

int main() {
    pid_t pid = fork();

    if (pid == 0) {
        printf("Child process: %d\n", getpid());
        exit(0);   // child exits immediately
    }
    else {
        printf("Parent process: %d\n", getpid());
        sleep(10); // parent sleeps → zombie created
    }
}