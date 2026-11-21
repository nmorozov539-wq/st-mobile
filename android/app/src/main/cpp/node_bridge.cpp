// Adapted from RodneyCw1/SillyTavern-Android (AGPL-3.0),
// android/app/src/main/cpp/node_bridge.cpp.
// Changes: JNI symbol renamed for package app.stm; comments added.
//
// Runs Node.js in the calling thread of the current process (node::Start blocks
// until the event loop exits). stdout/stderr are redirected to capped private log files.
// Node can only be started once per process, so the service runs in its own
// ":runtime" process and that process is killed when the engine stops.
#include <jni.h>
#include <node.h>
#include <string>
#include <vector>
#include <cstring>
#include <unistd.h>
#include <fcntl.h>
#include <signal.h>
#include <cstdlib>
#include <cerrno>
#include <cstdio>
#include <sys/stat.h>
#include <thread>

namespace {
constexpr off_t kMaxLogBytes = 1024 * 1024;

void writeAll(int fd, const char* data, size_t size) {
    while (size > 0) {
        const ssize_t written = write(fd, data, size);
        if (written > 0) {
            data += written;
            size -= static_cast<size_t>(written);
        } else if (written < 0 && errno == EINTR) {
            continue;
        } else {
            return;
        }
    }
}

int openCurrentLog(const std::string& path, off_t& size) {
    struct stat info {};
    if (stat(path.c_str(), &info) == 0 && info.st_size > kMaxLogBytes) {
        // Do not preserve an unbounded log left by an older build.
        unlink(path.c_str());
    }
    const int fd = open(path.c_str(), O_CREAT | O_WRONLY | O_APPEND, 0600);
    size = fd >= 0 ? lseek(fd, 0, SEEK_END) : 0;
    return fd;
}

int rotateLog(const std::string& path, int fd, off_t& size) {
    if (fd >= 0) close(fd);
    const std::string previous = path + ".1";
    unlink(previous.c_str());
    if (rename(path.c_str(), previous.c_str()) != 0) unlink(path.c_str());
    size = 0;
    return open(path.c_str(), O_CREAT | O_WRONLY | O_TRUNC, 0600);
}

/** Drains Node's stdout/stderr and retains at most two 1 MiB private log files. */
void drainLog(int readFd, const std::string& path) {
    off_t size = 0;
    int fd = openCurrentLog(path, size);
    char buffer[16 * 1024];
    while (true) {
        const ssize_t count = read(readFd, buffer, sizeof(buffer));
        if (count > 0) {
            if (size + count > kMaxLogBytes) fd = rotateLog(path, fd, size);
            if (fd >= 0) {
                writeAll(fd, buffer, static_cast<size_t>(count));
                size += count;
            }
        } else if (count < 0 && errno == EINTR) {
            continue;
        } else {
            break;
        }
    }
    if (fd >= 0) close(fd);
    close(readFd);
}
} // namespace

extern "C" JNIEXPORT jint JNICALL
Java_app_stm_NodeRuntime_start(JNIEnv* env, jobject, jobjectArray input, jstring logPath) {
    const char* log = env->GetStringUTFChars(logPath, nullptr);
    const std::string logFile(log);
    env->ReleaseStringUTFChars(logPath, log);
    int logPipe[2];
    std::thread logThread;
    bool capturesLog = false;
    if (pipe(logPipe) == 0) {
        try {
            logThread = std::thread(drainLog, logPipe[0], logFile);
            dup2(logPipe[1], STDOUT_FILENO);
            dup2(logPipe[1], STDERR_FILENO);
            close(logPipe[1]);
            capturesLog = true;
        } catch (...) {
            close(logPipe[0]);
            close(logPipe[1]);
        }
    }
    if (!capturesLog) {
        // A missing diagnostic log is safer than allowing an unbounded fallback.
        const int devNull = open("/dev/null", O_WRONLY);
        if (devNull >= 0) {
            dup2(devNull, STDOUT_FILENO);
            dup2(devNull, STDERR_FILENO);
            close(devNull);
        }
    }
    signal(SIGPIPE, SIG_IGN);
    setenv("ST_ANDROID_PAGE_SIZE", std::to_string(sysconf(_SC_PAGESIZE)).c_str(), 1);
    const int count = env->GetArrayLength(input);
    std::vector<std::string> values;
    size_t size = 0;
    for (int i = 0; i < count; ++i) {
        auto value = static_cast<jstring>(env->GetObjectArrayElement(input, i));
        const char* utf = env->GetStringUTFChars(value, nullptr);
        values.emplace_back(utf); size += values.back().size() + 1;
        env->ReleaseStringUTFChars(value, utf); env->DeleteLocalRef(value);
    }
    std::vector<char> buffer(size);
    std::vector<char*> argv(count + 1, nullptr);
    size_t offset = 0;
    for (int i = 0; i < count; ++i) {
        argv[i] = buffer.data() + offset;
        std::memcpy(argv[i], values[i].c_str(), values[i].size() + 1);
        offset += values[i].size() + 1;
    }
    const int result = node::Start(count, argv.data());
    if (capturesLog) {
        fflush(nullptr);
        close(STDOUT_FILENO);
        close(STDERR_FILENO);
        logThread.join();
    }
    return result;
}
