// Adapted from RodneyCw1/SillyTavern-Android (AGPL-3.0),
// android/app/src/main/cpp/node_bridge.cpp.
// Changes: JNI symbol renamed for package app.pockettavern; comments added.
//
// Runs Node.js in the calling thread of the current process (node::Start blocks
// until the event loop exits). stdout/stderr are redirected to a log file.
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
extern "C" JNIEXPORT jint JNICALL
Java_app_pockettavern_NodeRuntime_start(JNIEnv* env, jobject, jobjectArray input, jstring logPath) {
    const char* log = env->GetStringUTFChars(logPath, nullptr);
    const int fd = open(log, O_CREAT | O_WRONLY | O_APPEND, 0600);
    env->ReleaseStringUTFChars(logPath, log);
    if (fd >= 0) { dup2(fd, STDOUT_FILENO); dup2(fd, STDERR_FILENO); close(fd); }
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
    return node::Start(count, argv.data());
}
